import assert from "node:assert/strict";
import test from "node:test";
import type { Deal } from "../components/deal-dashboard.tsx";
import { buildFromSnapshot, type FeedScanSnapshot } from "./dashboard-snapshot-builder.ts";
import { loadRemoteDashboard } from "./dashboard-runtime.ts";

function deal(name: string, score: number, firstSeen: string): Deal {
  return {
    id: score,
    name,
    category: "software",
    summary: "fixture",
    value_amount: null,
    value_currency: null,
    value_label: "fixture",
    value_score: score,
    requirements: "fixture",
    regions: "Global",
    hidden_conditions: "",
    starts_at: null,
    ends_at: null,
    steps: "fixture",
    official_url: `https://example.com/${name.toLowerCase()}`,
    source_url: `https://example.com/${name.toLowerCase()}`,
    source_name: "Fixture",
    source_type: "feed",
    source_subreddit: null,
    source_account: null,
    source_official: false,
    verification_status: "pending",
    status: "active",
    confidence: 50,
    risk_notes: "",
    first_seen_at: firstSeen,
    last_verified_at: firstSeen,
  };
}

function snapshot(overrides: Partial<FeedScanSnapshot> = {}): FeedScanSnapshot {
  return {
    generated_at: "2026-11-12T10:00:00.000Z",
    status: "success",
    sources_checked: 2,
    candidates_found: 2,
    failures: [],
    source_results: [],
    deals: [
      deal("Lower", 998, "2026-11-12T05:00:00.000Z"),
      deal("Higher", 999, "2026-11-12T04:00:00.000Z"),
    ],
    ...overrides,
  };
}

test("buildFromSnapshot sorts deals by score then first seen time", () => {
  const result = buildFromSnapshot(snapshot());
  assert.deepEqual(result.deals.slice(0, 2).map((item) => item.name), ["Higher", "Lower"]);
  assert.equal(result.latestScan.finished_at, "2026-11-12T10:00:00.000Z");
});

test("partial snapshot notes include the failed-source count", () => {
  const result = buildFromSnapshot(snapshot({
    status: "partial",
    failures: [{ source_id: "one", source_name: "One", error: "HTTP 500" }],
  }));
  assert.match(result.latestScan.notes, /失败 1 个/);
});

test("remote loader falls back to the bundled snapshot on HTTP errors", async () => {
  const fallback = buildFromSnapshot(snapshot());
  const fetchImpl = async () => new Response("unavailable", { status: 500 });
  const result = await loadRemoteDashboard({ fallback, fetchImpl: fetchImpl as typeof fetch });
  assert.equal(result, fallback);
});

test("remote loader builds a live snapshot when fetch succeeds", async () => {
  const fallback = buildFromSnapshot(snapshot());
  const live = snapshot({ generated_at: "2026-11-12T12:00:00.000Z" });
  const fetchImpl = async () => Response.json(live);
  const result = await loadRemoteDashboard({ fallback, fetchImpl: fetchImpl as typeof fetch });
  assert.equal(result.latestScan.finished_at, "2026-11-12T12:00:00.000Z");
});
