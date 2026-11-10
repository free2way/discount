import { env } from "cloudflare:workers";
import type { Deal, ScanRun } from "@/components/deal-dashboard";
import { initialScanDeals, initialScanRun } from "@/data/initial-scan";

const snapshot = { deals: initialScanDeals, latestScan: initialScanRun };

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
    const deals = (dealsResult.results ?? []) as unknown as Deal[];
    if (!deals.length) return snapshot;
    return {
      deals,
      latestScan: (scanResult.results?.[0] ?? initialScanRun) as unknown as ScanRun,
    };
  } catch {
    return snapshot;
  }
}
