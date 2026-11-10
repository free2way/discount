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
