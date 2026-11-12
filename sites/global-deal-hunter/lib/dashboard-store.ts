import type { Deal, ScanRun } from "@/components/deal-dashboard";
import { DEFAULT_SNAPSHOT_SOURCE_URL, loadRemoteDashboard } from "@/lib/dashboard-runtime";
import { snapshotDeals, snapshotScanRun, snapshotSourceHealth } from "@/lib/dashboard-snapshot";

const fallback = { deals: snapshotDeals, latestScan: snapshotScanRun, sourceHealth: snapshotSourceHealth };

/**
 * Vercel-safe dashboard loader.
 *
 * The original Sites deployment uses Cloudflare D1 and Vite aliases this
 * module to dashboard-store.sites.ts. A standard Next.js build cannot import
 * cloudflare:workers, so Vercel serves the latest verified scan snapshot.
 */
export async function loadDashboard(): Promise<{
  deals: Deal[];
  latestScan: ScanRun;
  sourceHealth: typeof snapshotSourceHealth;
}> {
  return loadRemoteDashboard({
    fallback,
    sourceUrl: process.env.SNAPSHOT_SOURCE_URL?.trim() || DEFAULT_SNAPSHOT_SOURCE_URL,
  });
}
