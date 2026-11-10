import { XMLParser } from "fast-xml-parser";
import type { Deal } from "@/components/deal-dashboard";

export type FeedSourceDefinition = {
  id: string;
  name: string;
  url: string;
  format: "linuxdo_markdown" | "feed" | "epic_json";
  allowedHosts: string[];
};

export type FeedItem = {
  url: string;
  title: string;
  summary: string;
  publishedAt: number | null;
  expiresAt: number | null;
};

export type FeedSourceResult = {
  source: FeedSourceDefinition;
  ok: boolean;
  finalUrl: string | null;
  items: FeedItem[];
  error: string | null;
};

// Source selection and parsing rules are adapted from PerkRadar (MIT).
// See THIRD_PARTY_NOTICES.md. URLs are fixed so callers cannot turn the
// scanner into an arbitrary network fetcher.
export const FEED_SOURCE_DEFINITIONS: FeedSourceDefinition[] = [
  {
    id: "linuxdo",
    name: "LINUX DO 福利羊毛",
    url: "https://r.jina.ai/https://linux.do/c/welfare/36.rss",
    format: "linuxdo_markdown",
    allowedHosts: ["linux.do"],
  },
  {
    id: "v2ex",
    name: "V2EX 推广",
    url: "https://www.v2ex.com/feed/promotions.xml",
    format: "feed",
    allowedHosts: ["v2ex.com"],
  },
  {
    id: "epic",
    name: "Epic Games",
    url: "https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=zh-CN&country=CN&allowCountries=CN",
    format: "epic_json",
    allowedHosts: ["store.epicgames.com"],
  },
  {
    id: "nodeseek",
    name: "NodeSeek",
    url: "https://rss.nodeseek.com/",
    format: "feed",
    allowedHosts: ["nodeseek.com"],
  },
  {
    id: "appinn",
    name: "小众软件",
    url: "https://www.appinn.com/feed/",
    format: "feed",
    allowedHosts: ["appinn.com"],
  },
  {
    id: "ghxi",
    name: "果核剥壳",
    url: "https://www.ghxi.com/feed",
    format: "feed",
    allowedHosts: ["ghxi.com"],
  },
  {
    id: "iplaysoft",
    name: "异次元软件世界",
    url: "https://www.iplaysoft.com/feed",
    format: "feed",
    allowedHosts: ["iplaysoft.com"],
  },
];

const xmlParser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
  trimValues: true,
  textNodeName: "#text",
});

const RFC822_DATE = /\b(?:Mon|Tue|Wed|Thu|Fri|Sat|Sun), \d{2} (?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec) \d{4} \d{2}:\d{2}:\d{2} [+-]\d{4}\b/;
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_RESPONSE_CHARS = 1_500_000;
const MAX_FEED_ITEMS = 2_000;
const MAX_DASHBOARD_ITEMS_PER_SOURCE = 12;
const MIN_PUBLISH_TIME = Date.parse("2000-01-01T00:00:00.000Z");

function cleanText(value: string, limit: number) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#39;/gi, "'")
    .replace(/&quot;/gi, '"')
    .replace(/&#x([0-9a-f]+);/gi, (_, hex: string) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, decimal: string) => String.fromCodePoint(Number.parseInt(decimal, 10)))
    .replace(/\u001b?\[(?:\d{1,2};?)+m/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, limit);
}

function nodeText(node: unknown): string {
  if (node == null) return "";
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).filter(Boolean).join(" ");
  if (typeof node === "object") {
    const record = node as Record<string, unknown>;
    if ("#text" in record) return nodeText(record["#text"]);
  }
  return "";
}

function linkValue(node: unknown): string {
  if (typeof node === "string") return node.trim();
  if (Array.isArray(node)) {
    const alternate = node.find((entry) => entry && typeof entry === "object" && (entry as Record<string, unknown>)["@_rel"] === "alternate");
    return linkValue(alternate ?? node[0]);
  }
  if (node && typeof node === "object") {
    const href = (node as Record<string, unknown>)["@_href"];
    if (typeof href === "string") return href.trim();
    return nodeText(node).trim();
  }
  return "";
}

function list(node: unknown): unknown[] {
  if (node == null) return [];
  return Array.isArray(node) ? node : [node];
}

function safeTime(value: unknown, now: number): number | null {
  const raw = nodeText(value).trim();
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isFinite(parsed) || parsed < MIN_PUBLISH_TIME || parsed > now + SEVEN_DAYS_MS) return null;
  return parsed;
}

export function canonicalFeedUrl(raw: string): string {
  if (raw.length > 2_048) throw new Error("链接过长");
  const url = new URL(raw.trim());
  if (!["http:", "https:"].includes(url.protocol) || url.username || url.password) throw new Error("无效链接");
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|spm$|spm_|ref$|fbclid$|gclid$|mc_)/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, "");
  return url.toString();
}

function onAllowedHost(rawUrl: string, source: FeedSourceDefinition): string | null {
  try {
    const normalized = canonicalFeedUrl(rawUrl);
    const host = new URL(normalized).hostname;
    return source.allowedHosts.some((allowed) => host === allowed || host.endsWith(`.${allowed}`)) ? normalized : null;
  } catch {
    return null;
  }
}

export function parseLinuxDoMarkdown(markdown: string): FeedItem[] {
  if (!markdown.includes("linux.do/t/topic/")) throw new Error("返回内容不是 LINUX DO 福利列表，可能被阻断");
  const items: FeedItem[] = [];
  for (const chunk of markdown.split(/^### \[/m).slice(1)) {
    const titleEnd = chunk.indexOf("](");
    if (titleEnd < 0) continue;
    const title = cleanText(chunk.slice(0, titleEnd), 300);
    const urlMatch = /^\]\((https?:\/\/linux\.do\/t\/topic\/\d+)\)/.exec(chunk.slice(titleEnd));
    const dateMatch = RFC822_DATE.exec(chunk);
    const publishedAt = dateMatch ? Date.parse(dateMatch[0]) : Number.NaN;
    if (!title || !urlMatch || !Number.isFinite(publishedAt)) continue;
    items.push({ url: urlMatch[1], title, summary: "", publishedAt, expiresAt: null });
  }
  if (!items.length) throw new Error("未能从 LINUX DO Markdown 解析出条目");
  return items;
}

export function parseSyndicationFeed(xml: string, now: number): FeedItem[] {
  const head = xml.slice(0, 400).toLowerCase();
  if (head.includes("<!doctype html") || /<html[\s>]/.test(head)) throw new Error("返回的是网页而不是订阅源，可能被阻断");
  let parsed: unknown;
  try {
    parsed = xmlParser.parse(xml);
  } catch {
    throw new Error("未能解析 RSS/Atom");
  }
  const root = parsed as { rss?: { channel?: { item?: unknown } }; feed?: { entry?: unknown } };
  const records = root.rss?.channel ? list(root.rss.channel.item) : root.feed ? list(root.feed.entry) : null;
  if (!records) throw new Error("未能解析 RSS/Atom");
  const items: FeedItem[] = [];
  for (const raw of records.slice(0, MAX_FEED_ITEMS)) {
    if (!raw || typeof raw !== "object") continue;
    const record = raw as Record<string, unknown>;
    const title = cleanText(nodeText(record.title), 300);
    const url = linkValue(record.link);
    if (!title || !url) continue;
    const summary = cleanText(nodeText(record.description) || nodeText(record.summary) || nodeText(record.encoded) || nodeText(record.content), 320);
    const publishedAt = safeTime(record.pubDate, now) ?? safeTime(record.published, now) ?? safeTime(record.updated, now) ?? safeTime(record.date, now);
    items.push({ url, title, summary, publishedAt, expiresAt: null });
  }
  return items;
}

type EpicOffer = { startDate?: string; endDate?: string; discountSetting?: { discountPercentage?: number } };
type EpicElement = {
  title?: string;
  description?: string;
  productSlug?: string | null;
  offerMappings?: { pageSlug?: string; pageType?: string }[];
  catalogNs?: { mappings?: { pageSlug?: string; pageType?: string }[] };
  price?: { totalPrice?: { discountPrice?: number } };
  promotions?: { promotionalOffers?: { promotionalOffers?: EpicOffer[] }[] };
};

export function parseEpicFreePromotions(payload: unknown, now: number): FeedItem[] {
  const elements = (payload as { data?: { Catalog?: { searchStore?: { elements?: unknown } } } })?.data?.Catalog?.searchStore?.elements;
  if (!Array.isArray(elements)) throw new Error("Epic 响应缺少商品列表");
  if (!elements.length) throw new Error("Epic 商品列表为空");
  const items: FeedItem[] = [];
  const seen = new Set<string>();
  for (const raw of elements) {
    if (!raw || typeof raw !== "object") continue;
    const element = raw as EpicElement;
    if (element.price?.totalPrice?.discountPrice !== 0) continue;
    const activeOffers = (element.promotions?.promotionalOffers ?? [])
      .flatMap((group) => group.promotionalOffers ?? [])
      .filter((offer) => {
        const start = Date.parse(offer.startDate ?? "");
        const end = Date.parse(offer.endDate ?? "");
        const percentage = offer.discountSetting?.discountPercentage;
        return Number.isFinite(start) && Number.isFinite(end) && start <= now && now < end && (percentage === 0 || percentage === 100);
      });
    if (!activeOffers.length) continue;
    const mappings = [...(element.offerMappings ?? []), ...(element.catalogNs?.mappings ?? [])];
    const mapped = mappings.find((entry) => entry.pageType === "productHome" && entry.pageSlug && entry.pageSlug !== "home")?.pageSlug;
    const slug = mapped ?? element.productSlug;
    const title = cleanText(element.title ?? "", 300);
    if (!slug || slug.includes("..") || !title) continue;
    const url = `https://store.epicgames.com/zh-CN/p/${slug}`;
    if (seen.has(url)) continue;
    seen.add(url);
    items.push({
      url,
      title,
      summary: cleanText(element.description ?? "", 320),
      publishedAt: Math.min(...activeOffers.map((offer) => Date.parse(offer.startDate ?? ""))),
      expiresAt: Math.max(...activeOffers.map((offer) => Date.parse(offer.endDate ?? ""))),
    });
  }
  return items;
}

async function readLimitedResponse(response: Response): Promise<string> {
  const announced = Number(response.headers.get("content-length") ?? "");
  if (Number.isFinite(announced) && announced > MAX_RESPONSE_CHARS) throw new Error("响应过大");
  if (!response.body) {
    const body = await response.text();
    if (body.length > MAX_RESPONSE_CHARS) throw new Error("响应过大");
    return body;
  }
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let body = "";
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    body += decoder.decode(value, { stream: true });
    if (body.length > MAX_RESPONSE_CHARS) {
      await reader.cancel().catch(() => undefined);
      throw new Error("响应过大");
    }
  }
  body += decoder.decode();
  return body;
}

export async function loadFeedSource(source: FeedSourceDefinition, now: number, fetchImpl: typeof fetch = fetch): Promise<FeedSourceResult> {
  try {
    const headers: Record<string, string> = {
      accept: "application/rss+xml, application/atom+xml, application/xml, application/json, text/markdown, text/plain, */*",
      "user-agent": "GlobalDealHunter/1.0 (+https://github.com/free2way/discount)",
    };
    if (source.id === "linuxdo" && process.env.JINA_API_KEY?.trim()) headers.authorization = `Bearer ${process.env.JINA_API_KEY.trim()}`;
    const response = await fetchImpl(source.url, { headers, redirect: "follow", signal: AbortSignal.timeout(25_000) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const body = await readLimitedResponse(response);
    let parsed: FeedItem[];
    if (source.format === "linuxdo_markdown") parsed = parseLinuxDoMarkdown(body);
    else if (source.format === "epic_json") {
      try {
        parsed = parseEpicFreePromotions(JSON.parse(body), now);
      } catch (error) {
        if (error instanceof SyntaxError) throw new Error("Epic 响应不是 JSON");
        throw error;
      }
    } else parsed = parseSyndicationFeed(body, now);
    const items = parsed.flatMap((item) => {
      const allowed = onAllowedHost(item.url, source);
      return allowed ? [{ ...item, url: allowed }] : [];
    });
    return { source, ok: true, finalUrl: response.url || source.url, items, error: null };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { source, ok: false, finalUrl: null, items: [], error: message.slice(0, 180) || "抓取失败" };
  }
}

export async function scanFeedSources(now = Date.now(), fetchImpl: typeof fetch = fetch): Promise<FeedSourceResult[]> {
  return Promise.all(FEED_SOURCE_DEFINITIONS.map((source) => loadFeedSource(source, now, fetchImpl)));
}

function stableId(value: string): number {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return 100_000 + (hash >>> 0) % 1_900_000_000;
}

function categoryFor(title: string, sourceId: string): Deal["category"] {
  if (sourceId === "epic") return "software";
  const value = title.toLowerCase();
  if (/chatgpt|claude|gemini|midjourney|suno|ai|人工智能|大模型|gpt|llm/.test(value)) return "ai";
  if (/vps|服务器|云主机|主机|域名|cloud|hosting|docker|kubernetes/.test(value)) return "cloud";
  if (/crypto|空投|airdrop|交易所|区块链|web3|usdt|btc|eth/.test(value)) return "crypto";
  if (/银行卡|信用卡|借记卡|返现|开户|银行|虚拟卡|u卡/.test(value)) return "cards";
  if (/软件|限免|app|工具|开源|license|会员|订阅|pro/.test(value)) return "software";
  return "other";
}

export function feedResultsToDeals(
  results: FeedSourceResult[],
  scannedAt: string,
  previousFirstSeen: Map<string, string> = new Map(),
): Deal[] {
  const now = Date.parse(scannedAt);
  const cutoff = now - SEVEN_DAYS_MS;
  return results.flatMap((result) => {
    if (!result.ok) return [];
    return result.items
      .filter((item) => item.expiresAt ? item.expiresAt > now : item.publishedAt == null || item.publishedAt >= cutoff)
      .sort((a, b) => (b.publishedAt ?? now) - (a.publishedAt ?? now))
      .slice(0, MAX_DASHBOARD_ITEMS_PER_SOURCE)
      .map((item) => {
        const official = result.source.id === "epic";
        const category = categoryFor(item.title, result.source.id);
        const endingSoon = item.expiresAt != null && item.expiresAt - now <= SEVEN_DAYS_MS;
        const firstSeen = previousFirstSeen.get(item.url) ?? scannedAt;
        return {
          id: stableId(item.url),
          name: item.title,
          category,
          summary: item.summary || `${result.source.name} 返回的公开线索；原始订阅未提供摘要。`,
          value_amount: official ? 0 : null,
          value_currency: official ? "USD" : null,
          value_label: official ? "当前免费（0元）" : "待核实线索",
          value_score: official ? 78 : category === "ai" || category === "cloud" ? 52 : 42,
          requirements: official ? "在 Epic Games 账户所在地区可领取；以商店页显示为准。" : "需打开原文确认活动、资格、地区与有效期。",
          regions: official ? "Epic 支持地区" : "来源未注明",
          hidden_conditions: official ? "仅收录当前促销窗口内折扣价为 0 的项目；地区库存可能不同。" : "RSS/Atom/社区标题只代表发现线索，不证明免费、折扣或仍然有效。",
          starts_at: item.publishedAt == null ? null : new Date(item.publishedAt).toISOString(),
          ends_at: item.expiresAt == null ? null : new Date(item.expiresAt).toISOString(),
          steps: official ? "打开 Epic 官方商品页，登录后核对价格为 0，再完成领取。" : "打开原始来源；回溯品牌或项目官方页面；核对条件后再参与。",
          official_url: item.url,
          source_url: item.url,
          source_name: result.source.name,
          source_type: official ? "official" : "feed",
          source_subreddit: null,
          source_account: null,
          source_official: official,
          verification_status: official ? "verified" : "pending",
          status: endingSoon ? "ending_soon" : "active",
          confidence: official ? 96 : 55,
          risk_notes: official ? "领取前确认结算价为 0；不要使用第三方代领或共享账号。" : "未完成官方交叉验证；不要转账、授权钱包、提供验证码、助记词或私钥。",
          first_seen_at: firstSeen,
          last_verified_at: scannedAt,
        } satisfies Deal;
      });
  });
}
