import feedScan from "@/data/feed-scan.json";
import { buildFromSnapshot } from "@/lib/dashboard-snapshot-builder";
import type { FeedScanSnapshot } from "@/lib/dashboard-snapshot-builder";

const snapshot = buildFromSnapshot(feedScan as FeedScanSnapshot);

export const snapshotDeals = snapshot.deals;
export const snapshotScanRun = snapshot.latestScan;
export const snapshotSourceHealth = snapshot.sourceHealth;
export { buildFromSnapshot } from "@/lib/dashboard-snapshot-builder";
