import { env } from "cloudflare:workers";
import type { Deal, ScanRun } from "@/components/deal-dashboard";

export async function loadDashboard(): Promise<{
  deals: Deal[];
  latestScan: ScanRun;
}> {
  try {
    const db = env.DB;
    if (!db) return { deals: [], latestScan: null };
    const [dealsResult, scanResult] = await db.batch([
      db.prepare(
        "SELECT * FROM deals ORDER BY value_score DESC, first_seen_at DESC LIMIT 300",
      ),
      db.prepare("SELECT * FROM scan_runs ORDER BY finished_at DESC LIMIT 1"),
    ]);
    return {
      deals: (dealsResult.results ?? []) as unknown as Deal[],
      latestScan: (scanResult.results?.[0] ?? null) as unknown as ScanRun,
    };
  } catch {
    return { deals: [], latestScan: null };
  }
}
