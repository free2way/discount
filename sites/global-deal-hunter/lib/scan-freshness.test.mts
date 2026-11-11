import assert from "node:assert/strict";
import test from "node:test";
import { evaluateScanFreshness } from "./scan-freshness.mjs";

const nowMs = Date.parse("2026-11-11T06:00:00.000Z");

test("fresh snapshots do not start a redundant scan", () => {
  const result = evaluateScanFreshness({ generatedAt: "2026-11-11T05:00:00.000Z", nowMs });
  assert.equal(result.shouldScan, false);
  assert.equal(result.stale, false);
  assert.equal(result.ageMinutes, 60);
});

test("due snapshots start the compensation scan", () => {
  const result = evaluateScanFreshness({ generatedAt: "2026-11-11T04:00:00.000Z", nowMs });
  assert.equal(result.shouldScan, true);
  assert.equal(result.stale, false);
  assert.equal(result.reason, "snapshot is due");
});

test("snapshots older than three hours raise a missed-scan alert", () => {
  const result = evaluateScanFreshness({ generatedAt: "2026-11-11T02:59:00.000Z", nowMs });
  assert.equal(result.shouldScan, true);
  assert.equal(result.stale, true);
  assert.equal(result.ageMinutes, 181);
});

test("missing or future timestamps fail safe and request a scan", () => {
  for (const generatedAt of [undefined, "invalid", "2026-11-11T06:06:00.000Z"]) {
    const result = evaluateScanFreshness({ generatedAt, nowMs });
    assert.equal(result.shouldScan, true);
    assert.equal(result.stale, true);
  }
});

test("manual dispatch always forces a scan", () => {
  const result = evaluateScanFreshness({ generatedAt: "2026-11-11T05:59:00.000Z", nowMs, force: true });
  assert.equal(result.shouldScan, true);
  assert.equal(result.reason, "manual dispatch");
});
