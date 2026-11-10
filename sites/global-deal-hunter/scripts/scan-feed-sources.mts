import { readFile, rename, writeFile } from "node:fs/promises";
import { feedResultsToDeals, scanFeedSources } from "../lib/feed-sources.mts";
import type { Deal } from "../components/deal-dashboard";

type FeedSnapshot = {
  generated_at: string;
  status: "success" | "partial" | "failed";
  sources_checked: number;
  candidates_found: number;
  verified_count: number;
  pending_count: number;
  failures: { source_id: string; source_name: string; error: string }[];
  source_results: { source_id: string; source_name: string; ok: boolean; count: number; final_url: string | null }[];
  deals: Deal[];
};

const outputUrl = new URL("../data/feed-scan.json", import.meta.url);
const temporaryUrl = new URL("../data/feed-scan.json.tmp", import.meta.url);

async function readPrevious(): Promise<FeedSnapshot | null> {
  try {
    return JSON.parse(await readFile(outputUrl, "utf8")) as FeedSnapshot;
  } catch {
    return null;
  }
}

const previous = await readPrevious();
const scannedAt = new Date().toISOString();
const results = await scanFeedSources(Date.parse(scannedAt));
const firstSeen = new Map((previous?.deals ?? []).map((deal) => [deal.official_url, deal.first_seen_at]));
const freshDeals = feedResultsToDeals(results, scannedAt, firstSeen);
const failedNames = new Set(results.filter((result) => !result.ok).map((result) => result.source.name));
const cutoff = Date.parse(scannedAt) - 7 * 24 * 60 * 60 * 1000;
const carriedDeals = (previous?.deals ?? []).filter((deal) => {
  if (!failedNames.has(deal.source_name)) return false;
  const expires = deal.ends_at ? Date.parse(deal.ends_at) : Number.POSITIVE_INFINITY;
  const published = deal.starts_at ? Date.parse(deal.starts_at) : Date.parse(deal.first_seen_at);
  return expires > Date.parse(scannedAt) && published >= cutoff;
});
const deduped = new Map<string, Deal>();
for (const deal of [...carriedDeals, ...freshDeals]) deduped.set(deal.official_url, deal);
const deals = [...deduped.values()].sort((a, b) => b.value_score - a.value_score || Date.parse(b.first_seen_at) - Date.parse(a.first_seen_at));
const failures = results.filter((result) => !result.ok).map((result) => ({
  source_id: result.source.id,
  source_name: result.source.name,
  error: result.error ?? "抓取失败",
}));
const successCount = results.length - failures.length;
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
  })),
  deals,
};

await writeFile(temporaryUrl, `${JSON.stringify(snapshot, null, 2)}\n`, "utf8");
await rename(temporaryUrl, outputUrl);

console.log(JSON.stringify({
  status: snapshot.status,
  sources: `${successCount}/${results.length}`,
  candidates: snapshot.candidates_found,
  published: snapshot.deals.length,
  verified: snapshot.verified_count,
  pending: snapshot.pending_count,
  failures: snapshot.failures,
}));
