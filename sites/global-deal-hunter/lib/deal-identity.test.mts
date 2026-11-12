import assert from "node:assert/strict";
import test from "node:test";
import { mergeDealsByCanonicalKey } from "./deal-identity.ts";

function candidate(overrides: Partial<{
  official_url: string;
  name: string;
  verification_status: string;
  value_score: number;
  last_verified_at: string;
}> = {}) {
  return {
    official_url: "https://example.com/deal?utm_source=feed",
    name: "Free Trial — 3 Months",
    verification_status: "pending",
    value_score: 50,
    last_verified_at: "2026-11-11T00:00:00.000Z",
    ...overrides,
  };
}

test("global merge removes canonical duplicates across sources", () => {
  const deals = mergeDealsByCanonicalKey([
    candidate(),
    candidate({ official_url: "https://www.example.com/deal", last_verified_at: "2026-11-12T00:00:00.000Z" }),
  ]);
  assert.equal(deals.length, 1);
  assert.equal(deals[0]?.last_verified_at, "2026-11-12T00:00:00.000Z");
});

test("verified wins over a higher-scored pending duplicate", () => {
  const deals = mergeDealsByCanonicalKey([
    candidate({ verification_status: "verified", value_score: 40 }),
    candidate({ verification_status: "pending", value_score: 95 }),
  ]);
  assert.equal(deals.length, 1);
  assert.equal(deals[0]?.verification_status, "verified");
  assert.equal(deals[0]?.value_score, 40);
});
