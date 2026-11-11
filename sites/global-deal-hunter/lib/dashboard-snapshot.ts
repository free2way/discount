import type { Deal, ScanRun } from "@/components/deal-dashboard";
import feedScan from "@/data/feed-scan.json";
import { initialScanDeals, initialScanRun } from "@/data/initial-scan";
import { dealUrlKey } from "@/lib/deal-identity";

const byUrl = new Map<string, Deal>();
for (const deal of [...initialScanDeals, ...(feedScan.deals as Deal[])]) {
  const key = dealUrlKey(deal.official_url);
  const current = byUrl.get(key);
  if (!current || deal.verification_status === "verified" || current.verification_status !== "verified") {
    byUrl.set(key, deal);
  }
}

export const snapshotDeals = [...byUrl.values()].sort(
  (a, b) => b.value_score - a.value_score || Date.parse(b.first_seen_at) - Date.parse(a.first_seen_at),
);

const latestFinishedAt = Date.parse(feedScan.generated_at) > Date.parse(initialScanRun.finished_at)
  ? feedScan.generated_at
  : initialScanRun.finished_at;

export const snapshotScanRun: Exclude<ScanRun, null> = {
  finished_at: latestFinishedAt,
  status: initialScanRun.status === feedScan.status ? feedScan.status : "partial",
  sources_checked: initialScanRun.sources_checked + feedScan.sources_checked,
  candidates_found: initialScanRun.candidates_found + feedScan.candidates_found,
  verified_count: snapshotDeals.filter((deal) => deal.verification_status === "verified").length,
  pending_count: snapshotDeals.filter((deal) => deal.verification_status !== "verified").length,
  archived_count: snapshotDeals.filter((deal) => deal.status === "expired").length,
  notes: `${initialScanRun.notes} 订阅快照状态：${feedScan.status}，失败 ${feedScan.failures.length} 个。`,
};

type SnapshotSourceResult = {
  source_id: string;
  source_name: string;
  ok: boolean;
  count: number;
  attempts?: number;
  response_ms?: number;
  consecutive_failures?: number;
  last_success_at?: string | null;
  error?: string | null;
};

export const snapshotSourceHealth = (feedScan.source_results as SnapshotSourceResult[]).map((source) => ({
  source_id: source.source_id,
  source_name: source.source_name,
  ok: source.ok,
  count: source.count,
  attempts: source.attempts ?? 1,
  response_ms: source.response_ms ?? 0,
  consecutive_failures: source.consecutive_failures ?? (source.ok ? 0 : 1),
  last_success_at: source.last_success_at ?? (source.ok ? feedScan.generated_at : null),
  error: source.error ?? (source.ok ? null : "抓取失败"),
}));
