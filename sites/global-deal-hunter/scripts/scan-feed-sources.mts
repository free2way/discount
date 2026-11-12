import { readFile, rename, writeFile } from "node:fs/promises";
import { feedResultsToDeals, feedResultsToReviewCandidates, scanFeedSources } from "../lib/feed-sources.mts";
import type { ReviewCandidate } from "../lib/feed-sources.mts";
import type { Deal } from "../components/deal-dashboard";
import { canonicalKey, dealUrlKey, mergeDealsByCanonicalKey } from "../lib/deal-identity.ts";

type FeedSnapshot = {
  generated_at: string;
  status: "success" | "partial" | "failed";
  sources_checked: number;
  candidates_found: number;
  verified_count: number;
  pending_count: number;
  failures: { source_id: string; source_name: string; error: string }[];
  source_results: {
    source_id: string;
    source_name: string;
    ok: boolean;
    count: number;
    final_url: string | null;
    attempts: number;
    response_ms: number;
    consecutive_failures: number;
    last_success_at: string | null;
    error: string | null;
  }[];
  deals: Deal[];
};

type ReviewSnapshot = {
  generated_at: string;
  queued_count: number;
  rejected_count: number;
  candidates: ReviewCandidate[];
};

const outputUrl = new URL("../data/feed-scan.json", import.meta.url);
const temporaryUrl = new URL("../data/feed-scan.json.tmp", import.meta.url);
const candidatesUrl = new URL("../data/candidate-review.json", import.meta.url);
const candidatesTemporaryUrl = new URL("../data/candidate-review.json.tmp", import.meta.url);

async function readPrevious(): Promise<FeedSnapshot | null> {
  try {
    return JSON.parse(await readFile(outputUrl, "utf8")) as FeedSnapshot;
  } catch {
    return null;
  }
}

async function readPreviousReview(): Promise<ReviewSnapshot | null> {
  try {
    return JSON.parse(await readFile(candidatesUrl, "utf8")) as ReviewSnapshot;
  } catch {
    return null;
  }
}

const previous = await readPrevious();
const previousReview = await readPreviousReview();
const scannedAt = new Date().toISOString();
const results = await scanFeedSources(Date.parse(scannedAt));
const firstSeen = new Map((previous?.deals ?? []).map((deal) => [canonicalKey(deal.official_url, deal.name), deal.first_seen_at]));
const freshDeals = feedResultsToDeals(results, scannedAt, firstSeen);
const failedNames = new Set(results.filter((result) => !result.ok).map((result) => result.source.name));
const cutoff = Date.parse(scannedAt) - 7 * 24 * 60 * 60 * 1000;
const carriedDeals = (previous?.deals ?? []).filter((deal) => {
  if (!failedNames.has(deal.source_name)) return false;
  const expires = deal.ends_at ? Date.parse(deal.ends_at) : Number.POSITIVE_INFINITY;
  const published = deal.starts_at ? Date.parse(deal.starts_at) : Date.parse(deal.first_seen_at);
  return expires > Date.parse(scannedAt) && published >= cutoff;
});
const deals = mergeDealsByCanonicalKey([...carriedDeals, ...freshDeals])
  .sort((a, b) => b.value_score - a.value_score || Date.parse(b.first_seen_at) - Date.parse(a.first_seen_at));
const failures = results.filter((result) => !result.ok).map((result) => ({
  source_id: result.source.id,
  source_name: result.source.name,
  error: result.error ?? "抓取失败",
}));
const successCount = results.length - failures.length;
const previousHealth = new Map((previous?.source_results ?? []).map((source) => [source.source_id, source]));
const snapshot: FeedSnapshot = {
  generated_at: scannedAt,
  status: successCount === results.length ? "success" : successCount === 0 ? "failed" : "partial",
  sources_checked: results.length,
  candidates_found: results.reduce((total, result) => total + result.items.length, 0),
  verified_count: deals.filter((deal) => deal.verification_status === "verified").length,
  pending_count: deals.filter((deal) => deal.verification_status !== "verified").length,
  failures,
  source_results: results.map((result) => ({
    source_id: result.source.id,
    source_name: result.source.name,
    ok: result.ok,
    count: result.items.length,
    final_url: result.finalUrl,
    attempts: result.attempts,
    response_ms: result.responseMs,
    consecutive_failures: result.ok ? 0 : (previousHealth.get(result.source.id)?.consecutive_failures ?? 0) + 1,
    last_success_at: result.ok ? scannedAt : previousHealth.get(result.source.id)?.last_success_at ?? null,
    error: result.error,
  })),
  deals,
};

const publishedUrls = new Set(deals.map((deal) => dealUrlKey(deal.official_url)));
const previousCandidates = new Map((previousReview?.candidates ?? []).map((candidate) => [candidate.key, candidate]));
const candidateMap = new Map<string, ReviewCandidate>();
for (const candidate of feedResultsToReviewCandidates(results, Date.parse(scannedAt))) {
  if (publishedUrls.has(dealUrlKey(candidate.source_url))) continue;
  const prior = previousCandidates.get(candidate.key);
  candidateMap.set(candidate.key, {
    ...candidate,
    review_status: candidate.risk_flags.length ? "rejected" : prior?.review_status ?? candidate.review_status,
  });
}
const failedSourceIds = new Set(results.filter((result) => !result.ok).map((result) => result.source.id));
for (const candidate of previousReview?.candidates ?? []) {
  if (failedSourceIds.has(candidate.source_id) && !publishedUrls.has(dealUrlKey(candidate.source_url)) && !candidateMap.has(candidate.key)) {
    candidateMap.set(candidate.key, candidate);
  }
}
const candidates = [...candidateMap.values()]
  .sort((a, b) => b.relevance_score - a.relevance_score || b.risk_score - a.risk_score)
  .slice(0, 500);
const reviewSnapshot = {
  generated_at: scannedAt,
  queued_count: candidates.filter((candidate) => candidate.review_status === "queued").length,
  rejected_count: candidates.filter((candidate) => candidate.review_status === "rejected").length,
  candidates,
};

await writeFile(temporaryUrl, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
await rename(temporaryUrl, outputUrl);
await writeFile(candidatesTemporaryUrl, `${JSON.stringify(reviewSnapshot, null, 2)}\n`, "utf8");
await rename(candidatesTemporaryUrl, candidatesUrl);

console.log(JSON.stringify({
  status: snapshot.status,
  sources: `${successCount}/${results.length}`,
  candidates: snapshot.candidates_found,
  published: snapshot.deals.length,
  verified: snapshot.verified_count,
  pending: snapshot.pending_count,
  review_queue: reviewSnapshot.queued_count,
  auto_rejected: reviewSnapshot.rejected_count,
  failures: snapshot.failures,
}));
