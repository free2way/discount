import assert from "node:assert/strict";
import test from "node:test";
import {
  canonicalKey,
  integerValue,
  parseOfferInput,
} from "./deal-input.mts";

const validOffer = {
  name: " Example Offer ",
  category: "ai",
  summary: "A verified offer.",
  value_amount: 20,
  value_currency: "USD",
  value_label: "$20",
  value_score: 80,
  requirements: "New users",
  regions: "Global",
  hidden_conditions: "None found",
  starts_at: "2026-11-01T00:00:00Z",
  ends_at: "2026-11-30T00:00:00Z",
  steps: "Open the official page.",
  official_url: "https://www.example.com/deal?utm_source=test#details",
  source_url: "https://example.com/deal",
  source_name: "Example",
  source_type: "official",
  source_subreddit: null,
  verification_status: "verified",
  status: "active",
  confidence: 95,
  risk_notes: "Check local eligibility.",
};

test("parseOfferInput validates and normalizes trusted fields", () => {
  const offer = parseOfferInput(validOffer);
  assert.equal(offer.name, "Example Offer");
  assert.equal(offer.startsAt, "2026-11-01T00:00:00.000Z");
  assert.equal(offer.key, "https://example.com/deal|example-offer");
});

test("parseOfferInput rejects unsafe URLs and invalid enum values", () => {
  assert.throws(
    () => parseOfferInput({ ...validOffer, official_url: "javascript:alert(1)" }),
    /must use http or https/,
  );
  assert.throws(
    () => parseOfferInput({ ...validOffer, category: "coupon" }),
    /category must be one of/,
  );
});

test("parseOfferInput rejects impossible date ranges and oversized data", () => {
  assert.throws(
    () =>
      parseOfferInput({
        ...validOffer,
        starts_at: "2026-12-01T00:00:00Z",
        ends_at: "2026-11-01T00:00:00Z",
      }),
    /ends_at must not be earlier/,
  );
  assert.throws(
    () => parseOfferInput({ ...validOffer, name: "x".repeat(241) }),
    /at most 240/,
  );
});

test("parseOfferInput accepts official X sources and requires their account", () => {
  const offer = parseOfferInput({
    ...validOffer,
    source_url: "https://x.com/example/status/123",
    source_type: "x",
    source_account: "example",
    source_official: true,
  });
  assert.equal(offer.sourceType, "x");
  assert.equal(offer.sourceAccount, "example");
  assert.equal(offer.sourceOfficial, true);

  assert.throws(
    () =>
      parseOfferInput({
        ...validOffer,
        source_url: "https://x.com/example/status/123",
        source_type: "x",
        source_account: null,
        source_official: true,
      }),
    /source_account is required/,
  );
  assert.throws(
    () =>
      parseOfferInput({
        ...validOffer,
        source_url: "https://x.com/random/status/123",
        source_type: "x",
        source_account: "random",
        source_official: false,
      }),
    /verified x sources must be marked/,
  );
});

test("parseOfferInput treats Reddit as a discovery source", () => {
  const offer = parseOfferInput({
    ...validOffer,
    source_url: "https://www.reddit.com/r/deals/comments/abc/example/",
    source_type: "reddit",
    source_subreddit: "deals",
    verification_status: "pending",
  });
  assert.equal(offer.sourceType, "reddit");
  assert.equal(offer.sourceSubreddit, "deals");

  assert.throws(
    () =>
      parseOfferInput({
        ...validOffer,
        source_url: "https://example.com/not-reddit",
        source_type: "reddit",
        source_subreddit: "deals",
      }),
    /reddit sources must use/,
  );
});

test("integerValue requires actual bounded integers", () => {
  assert.equal(integerValue({ limit: 20 }, "limit", { max: 100 }), 20);
  assert.throws(
    () => integerValue({ limit: "20" }, "limit", { max: 100 }),
    /must be an integer/,
  );
  assert.throws(
    () => integerValue({ limit: 101 }, "limit", { max: 100 }),
    /between 0 and 100/,
  );
});

test("canonicalKey removes tracking and normalizes the host", () => {
  assert.equal(
    canonicalKey("https://www.Example.com/deal/?z=2&UTM_Source=test&a=1#details", "Deal Name"),
    "https://example.com/deal?a=1&z=2|deal-name",
  );
});
