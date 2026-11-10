import { env } from "cloudflare:workers";
import DealDashboard, { type Deal, type ScanRun } from "@/components/deal-dashboard";

export const dynamic = "force-dynamic";

async function loadDashboard() {
  try {
    const db = env.DB;
    if (!db) return { deals: [] as Deal[], latestScan: null as ScanRun };
    const [dealsResult, scanResult] = await db.batch([
      db.prepare("SELECT * FROM deals ORDER BY value_score DESC, first_seen_at DESC LIMIT 300"),
      db.prepare("SELECT * FROM scan_runs ORDER BY finished_at DESC LIMIT 1"),
    ]);
    return {
      deals: (dealsResult.results ?? []) as unknown as Deal[],
      latestScan: (scanResult.results?.[0] ?? null) as unknown as ScanRun,
    };
  } catch {
    return { deals: [] as Deal[], latestScan: null as ScanRun };
  }
}

export default async function Home() {
  const data = await loadDashboard();
  return <DealDashboard deals={data.deals} latestScan={data.latestScan} />;
}
