import type { Deal, ScanRun, SourceHealth } from "../components/deal-dashboard.tsx";
import { initialScanDeals, initialScanRun } from "../data/initial-scan.ts";
import { mergeDealsByCanonicalKey } from "./deal-identity.ts";

export type FeedScanSnapshot = {
  generated_at: string;
  status: string;
  sources_checked: number;
  candidates_found: number;
  failures: Array<{ source_id: string; source_name: string; error: string }>;
  source_results: Array<{
    source_id: string;
    source_name: string;
    ok: boolean;
    count: number;
    attempts?: number;
    response_ms?: number;
    consecutive_failures?: number;
    last_success_at?: string | null;
    error?: string | null;
  }>;
  deals: Deal[];
};

export type DashboardSnapshot = {
  deals: Deal[];
  latestScan: Exclude<ScanRun, null>;
  sourceHealth: SourceHealth[];
};

export function buildFromSnapshot(feedScanJson: FeedScanSnapshot): DashboardSnapshot {
  const deals = mergeDealsByCanonicalKey([...initialScanDeals, ...feedScanJson.deals]).sort(
    (a, b) => b.value_score - a.value_score || Date.parse(b.first_seen_at) - Date.parse(a.first_seen_at),
  );
  const latestFinishedAt = Date.parse(feedScanJson.generated_at) > Date.parse(initialScanRun.finished_at)
    ? feedScanJson.generated_at
    : initialScanRun.finished_at;
  const latestScan: Exclude<ScanRun, null> = {
    finished_at: latestFinishedAt,
    status: initialScanRun.status === feedScanJson.status ? feedScanJson.status : "partial",
    sources_checked: initialScanRun.sources_checked + feedScanJson.sources_checked,
    candidates_found: initialScanRun.candidates_found + feedScanJson.candidates_found,
    verified_count: deals.filter((deal) => deal.verification_status === "verified").length,
    pending_count: deals.filter((deal) => deal.verification_status !== "verified").length,
    archived_count: deals.filter((deal) => deal.status === "expired").length,
    notes: `${initialScanRun.notes} 订阅快照状态：${feedScanJson.status}，失败 ${feedScanJson.failures.length} 个。`,
  };
  const sourceHealth: SourceHealth[] = feedScanJson.source_results.map((source) => ({
    source_id: source.source_id,
    source_name: source.source_name,
    ok: source.ok,
    count: source.count,
    attempts: source.attempts ?? 1,
    response_ms: source.response_ms ?? 0,
    consecutive_failures: source.consecutive_failures ?? (source.ok ? 0 : 1),
    last_success_at: source.last_success_at ?? (source.ok ? feedScanJson.generated_at : null),
    error: source.error ?? (source.ok ? null : "抓取失败"),
  }));
  return { deals, latestScan, sourceHealth };
}
