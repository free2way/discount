import assert from "node:assert/strict";
import test from "node:test";
import { canonicalFeedUrl, parseEpicFreePromotions, parseLinuxDoMarkdown, parseSyndicationFeed } from "./feed-sources.mts";

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
