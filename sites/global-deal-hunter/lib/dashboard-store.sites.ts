import { env } from "cloudflare:workers";
import type { Deal, ScanRun } from "@/components/deal-dashboard";
import { snapshotDeals, snapshotScanRun } from "@/lib/dashboard-snapshot";

const snapshot = { deals: snapshotDeals, latestScan: snapshotScanRun };

export async function loadDashboard(): Promise<{
  deals: Deal[];
  latestScan: ScanRun;
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
    const merged = new Map(snapshotDeals.map((deal) => [deal.official_url, deal]));
    for (const deal of databaseDeals) merged.set(deal.official_url, deal);
    const databaseScan = (scanResult.results?.[0] ?? null) as unknown as Exclude<ScanRun, null> | null;
    return {
      deals: [...merged.values()],
      latestScan: databaseScan && Date.parse(databaseScan.finished_at) > Date.parse(snapshotScanRun.finished_at)
        ? databaseScan
        : snapshotScanRun,
    };
  } catch {
    return snapshot;
  }
}
