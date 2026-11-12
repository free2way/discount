import type { DashboardSnapshot, FeedScanSnapshot } from "./dashboard-snapshot-builder.ts";
import { buildFromSnapshot } from "./dashboard-snapshot-builder.ts";

export const DEFAULT_SNAPSHOT_SOURCE_URL =
  "https://raw.githubusercontent.com/free2way/discount/main/sites/global-deal-hunter/data/feed-scan.json";

type NextFetchInit = RequestInit & { next: { revalidate: number } };

export async function loadRemoteDashboard({
  fallback,
  sourceUrl = DEFAULT_SNAPSHOT_SOURCE_URL,
  fetchImpl = fetch,
}: {
  fallback: DashboardSnapshot;
  sourceUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<DashboardSnapshot> {
  try {
    const response = await fetchImpl(sourceUrl, {
      next: { revalidate: 600 },
      signal: AbortSignal.timeout(8_000),
    } as NextFetchInit);
    if (!response.ok) throw new Error(`snapshot ${response.status}`);
    return buildFromSnapshot(await response.json() as FeedScanSnapshot);
  } catch {
    return fallback;
  }
}
