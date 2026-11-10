import type { Deal, ScanRun } from "@/components/deal-dashboard";
import { initialScanDeals, initialScanRun } from "@/data/initial-scan";

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
}> {
  return { deals: initialScanDeals, latestScan: initialScanRun };
}
