import { env } from "cloudflare:workers";
import type { Deal, ScanRun } from "@/components/deal-dashboard";
import { snapshotDeals, snapshotScanRun, snapshotSourceHealth } from "@/lib/dashboard-snapshot";
import { canonicalKey } from "@/lib/deal-identity";

const snapshot = { deals: snapshotDeals, latestScan: snapshotScanRun, sourceHealth: snapshotSourceHealth };

export async function loadDashboard(): Promise<{
  deals: Deal[];
  latestScan: ScanRun;
  sourceHealth: typeof snapshotSourceHealth;
}> {
  try {
    const db = env.DB;
    if (!db) return snapshot;
    const [dealsResult, scanResult] = await db.batch([
      db.prepare(
        "SELECT * FROM deals ORDER BY value_score DESC, first_seen_at DESC LIMIT 300",
      ),
      db.prepare("SELECT * FROM scan_runs ORDER BY finished_at DESC LIMIT 1"),
    ]);
    const databaseDeals = (dealsResult.results ?? []) as unknown as Deal[];
    const merged = new Map(snapshotDeals.map((deal) => [canonicalKey(deal.official_url, deal.name), deal]));
    for (const deal of databaseDeals) merged.set(canonicalKey(deal.official_url, deal.name), deal);
    const databaseScan = (scanResult.results?.[0] ?? null) as unknown as Exclude<ScanRun, null> | null;
    return {
      deals: [...merged.values()].sort(
        (a, b) => b.value_score - a.value_score || Date.parse(b.first_seen_at) - Date.parse(a.first_seen_at),
      ),
      latestScan: databaseScan && Date.parse(databaseScan.finished_at) > Date.parse(snapshotScanRun.finished_at)
        ? databaseScan
        : snapshotScanRun,
      sourceHealth: snapshotSourceHealth,
    };
  } catch {
    return snapshot;
  }
}
