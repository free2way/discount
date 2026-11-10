import type { Deal, ScanRun } from "@/components/deal-dashboard";
import feedScan from "@/data/feed-scan.json";
import { initialScanDeals, initialScanRun } from "@/data/initial-scan";

const byUrl = new Map<string, Deal>();
for (const deal of [...initialScanDeals, ...(feedScan.deals as Deal[])]) {
  const current = byUrl.get(deal.official_url);
  if (!current || deal.verification_status === "verified" || current.verification_status !== "verified") {
    byUrl.set(deal.official_url, deal);
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
  status: feedScan.status,
  sources_checked: initialScanRun.sources_checked + feedScan.sources_checked,
  candidates_found: initialScanRun.candidates_found + feedScan.candidates_found,
  verified_count: snapshotDeals.filter((deal) => deal.verification_status === "verified").length,
  pending_count: snapshotDeals.filter((deal) => deal.verification_status !== "verified").length,
  archived_count: snapshotDeals.filter((deal) => deal.status === "expired").length,
  notes: `官方、X、Reddit 与 7 个订阅源合并快照；订阅源状态：${feedScan.status}，失败 ${feedScan.failures.length} 个。`,
};
