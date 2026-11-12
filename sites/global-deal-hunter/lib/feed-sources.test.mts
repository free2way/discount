import assert from "node:assert/strict";
import test from "node:test";
import { FEED_SOURCE_DEFINITIONS, canonicalFeedUrl, feedResultsToDeals, feedResultsToReviewCandidates, loadFeedSource, parseEpicFreePromotions, parseLinuxDoMarkdown, parseSyndicationFeed } from "./feed-sources.mts";

test("LINUX DO Markdown parses title, topic link, and RFC822 date", () => {
  const input = "### [免费工具](https://linux.do/t/topic/12345)\n\nhttps://linux.do/t/topic/12345\n\nMon, 09 Nov 2026 06:00:00 +0000";
  const [item] = parseLinuxDoMarkdown(input);
  assert.equal(item?.title, "免费工具");
  assert.equal(item?.url, "https://linux.do/t/topic/12345");
  assert.equal(item?.publishedAt, Date.parse("Mon, 09 Nov 2026 06:00:00 +0000"));
});

test("V2EX Atom parses entries and canonical URL removes reply hash", () => {
  const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom"><entry><title>新人优惠</title><link rel="alternate" href="https://www.v2ex.com/t/123#reply0"/><updated>2026-11-10T05:00:00Z</updated><summary>测试摘要</summary></entry></feed>`;
  const [item] = parseSyndicationFeed(xml, Date.parse("2026-11-10T06:00:00Z"));
  assert.equal(canonicalFeedUrl(item!.url), "https://v2ex.com/t/123");
  assert.equal(item?.summary, "测试摘要");
});

test("RSS parser rejects HTML challenge pages", () => {
  assert.throws(() => parseSyndicationFeed("<!doctype html><html>blocked</html>", Date.now()), /网页|阻断/);
});

test("Epic keeps only active zero-price promotion windows", () => {
  const now = Date.parse("2026-11-10T06:00:00Z");
  const payload = { data: { Catalog: { searchStore: { elements: [
    { title: "Free now", productSlug: "free-now", price: { totalPrice: { discountPrice: 0 } }, promotions: { promotionalOffers: [{ promotionalOffers: [{ startDate: "2026-11-09T00:00:00Z", endDate: "2026-11-12T00:00:00Z", discountSetting: { discountPercentage: 0 } }] }] } },
    { title: "Paid", productSlug: "paid", price: { totalPrice: { discountPrice: 100 } }, promotions: { promotionalOffers: [{ promotionalOffers: [{ startDate: "2026-11-09T00:00:00Z", endDate: "2026-11-12T00:00:00Z", discountSetting: { discountPercentage: 50 } }] }] } },
  ] } } } };
  assert.deepEqual(parseEpicFreePromotions(payload, now).map((item) => item.title), ["Free now"]);
});

test("feed publishing keeps deal candidates and removes ordinary news", () => {
  const scannedAt = "2026-11-10T06:00:00.000Z";
  const deals = feedResultsToDeals([{
    source: { id: "test", name: "Test feed", url: "https://example.com/feed", format: "feed", allowedHosts: ["example.com"] },
    ok: true,
    finalUrl: "https://example.com/feed",
    error: null,
    attempts: 1,
    responseMs: 20,
    items: [
      { url: "https://example.com/deal", title: "限时免费领取一年会员", summary: "新用户优惠", publishedAt: Date.parse(scannedAt), expiresAt: null },
      { url: "https://example.com/news", title: "浏览器发布新版本", summary: "普通更新日志", publishedAt: Date.parse(scannedAt), expiresAt: null },
    ],
  }], scannedAt);
  assert.deepEqual(deals.map((deal) => deal.name), ["限时免费领取一年会员"]);
});

test("feed publishing and review queue reject future and stale entries", () => {
  const now = Date.parse("2026-11-10T06:00:00.000Z");
  const result = {
    source: { id: "test", name: "Test feed", url: "https://example.com/feed", format: "feed" as const, allowedHosts: ["example.com"] },
    ok: true,
    finalUrl: "https://example.com/feed",
    error: null,
    attempts: 1,
    responseMs: 20,
    items: [
      { url: "https://example.com/current", title: "当前限时免费", summary: "领取福利", publishedAt: now, expiresAt: null },
      { url: "https://example.com/future", title: "未来限时免费", summary: "领取福利", publishedAt: now + 86_400_000, expiresAt: null },
      { url: "https://example.com/stale", title: "过期限时免费", summary: "领取福利", publishedAt: now - 8 * 86_400_000, expiresAt: null },
    ],
  };
  assert.deepEqual(feedResultsToDeals([result], new Date(now).toISOString()).map((deal) => deal.name), ["当前限时免费"]);
  assert.deepEqual(feedResultsToReviewCandidates([result], now).map((candidate) => candidate.title), ["当前限时免费"]);
});

test("international RSS sources parse entries and reject off-domain links", async () => {
  const now = Date.parse("2026-11-12T06:00:00.000Z");
  const source = FEED_SOURCE_DEFINITIONS.find((item) => item.id === "reddit_freebies")!;
  const xml = `<?xml version="1.0"?><feed xmlns="http://www.w3.org/2005/Atom">
    <entry><title>Free trial: 3 months</title><link href="https://www.reddit.com/r/freebies/comments/abc/free_trial/"/><updated>2026-11-12T05:00:00Z</updated></entry>
    <entry><title>Limited-time giveaway</title><link href="https://evil.example/phishing"/><updated>2026-11-12T05:00:00Z</updated></entry>
  </feed>`;
  const fetchImpl = async () => new Response(xml, { status: 200, headers: { "content-type": "application/atom+xml" } });
  const result = await loadFeedSource(source, now, fetchImpl as typeof fetch);
  assert.equal(result.ok, true);
  assert.deepEqual(result.items.map((item) => item.url), ["https://reddit.com/r/freebies/comments/abc/free_trial"]);
});

test("Slickdeals RSS fixture keeps allowed links and dates", async () => {
  const now = Date.parse("2026-11-12T06:00:00.000Z");
  const source = FEED_SOURCE_DEFINITIONS.find((item) => item.id === "slickdeals")!;
  const xml = `<?xml version="1.0"?><rss><channel><item><title>$20 off annual plan</title><link>https://slickdeals.net/f/123-example</link><pubDate>Thu, 12 Nov 2026 05:00:00 +0000</pubDate></item></channel></rss>`;
  const fetchImpl = async () => new Response(xml, { status: 200 });
  const result = await loadFeedSource(source, now, fetchImpl as typeof fetch);
  assert.equal(result.ok, true);
  assert.equal(result.items[0]?.publishedAt, Date.parse("Thu, 12 Nov 2026 05:00:00 +0000"));
  assert.equal(result.items[0]?.url, "https://slickdeals.net/f/123-example");
});
