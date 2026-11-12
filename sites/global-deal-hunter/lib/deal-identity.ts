export function normalizeUrl(raw: string) {
  const url = new URL(raw);
  const trackingKeys = new Set([
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "ref",
    "referral",
    "source",
  ]);
  for (const key of [...url.searchParams.keys()]) {
    if (trackingKeys.has(key.toLowerCase())) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString().replace(/\?$/, "");
}

export function dealUrlKey(officialUrl: string) {
  return normalizeUrl(officialUrl);
}

export function canonicalKey(officialUrl: string, name: string) {
  const normalizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${normalizeUrl(officialUrl)}|${normalizedName}`;
}

type CanonicalDeal = {
  official_url: string;
  name: string;
  verification_status: string;
  value_score: number;
  last_verified_at?: string;
};

export function isBetterCanonicalDeal<T extends CanonicalDeal>(candidate: T, current: T) {
  const candidateVerified = candidate.verification_status === "verified";
  const currentVerified = current.verification_status === "verified";
  if (candidateVerified !== currentVerified) return candidateVerified;
  if (candidate.value_score !== current.value_score) return candidate.value_score > current.value_score;
  return Date.parse(candidate.last_verified_at ?? "") > Date.parse(current.last_verified_at ?? "");
}

export function mergeDealsByCanonicalKey<T extends CanonicalDeal>(deals: T[]) {
  const merged = new Map<string, T>();
  for (const deal of deals) {
    const key = canonicalKey(deal.official_url, deal.name);
    const current = merged.get(key);
    if (!current || isBetterCanonicalDeal(deal, current)) merged.set(key, deal);
  }
  return [...merged.values()];
}
