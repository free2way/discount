export const DEAL_CATEGORIES = [
  "ai",
  "crypto",
  "cards",
  "banking",
  "cloud",
  "software",
  "other",
] as const;

export const SOURCE_TYPES = [
  "official",
  "reddit",
  "x",
  "trusted_media",
  "community",
] as const;

export const VERIFICATION_STATUSES = [
  "verified",
  "pending",
  "conflicting",
] as const;

export const DEAL_STATUSES = [
  "active",
  "ending_soon",
  "expired",
  "unknown",
] as const;

type StringEnum = readonly [string, ...string[]];

function stringValue(
  args: Record<string, unknown>,
  key: string,
  { required = true, maxLength }: { required?: boolean; maxLength: number },
) {
  const raw = args[key];
  if (raw == null && !required) return null;
  if (typeof raw !== "string") throw new Error(`${key} must be a string`);
  const value = raw.trim();
  if (required && !value) throw new Error(`Missing required field: ${key}`);
  if (value.length > maxLength) {
    throw new Error(`${key} must be at most ${maxLength} characters`);
  }
  return value;
}

export function requiredString(
  args: Record<string, unknown>,
  key: string,
  maxLength = 4_000,
) {
  return stringValue(args, key, { maxLength }) ?? "";
}

export function optionalString(
  args: Record<string, unknown>,
  key: string,
  maxLength = 4_000,
) {
  return stringValue(args, key, { required: false, maxLength });
}

export function enumString<T extends StringEnum>(
  args: Record<string, unknown>,
  key: string,
  allowed: T,
): T[number] {
  const value = requiredString(args, key, 40);
  if (!(allowed as readonly string[]).includes(value)) {
    throw new Error(`${key} must be one of: ${allowed.join(", ")}`);
  }
  return value as T[number];
}

export function integerValue(
  args: Record<string, unknown>,
  key: string,
  { min = 0, max, fallback }: { min?: number; max: number; fallback?: number },
) {
  const raw = args[key];
  if (raw == null && fallback !== undefined) return fallback;
  if (typeof raw !== "number" || !Number.isInteger(raw)) {
    throw new Error(`${key} must be an integer`);
  }
  if (raw < min || raw > max) {
    throw new Error(`${key} must be between ${min} and ${max}`);
  }
  return raw;
}

function optionalAmount(args: Record<string, unknown>, key: string) {
  const value = args[key];
  if (value == null) return null;
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new Error(`${key} must be a finite non-negative number or null`);
  }
  return value;
}

function booleanValue(
  args: Record<string, unknown>,
  key: string,
  fallback = false,
) {
  const value = args[key];
  if (value == null) return fallback;
  if (typeof value !== "boolean") throw new Error(`${key} must be a boolean`);
  return value;
}

export function httpUrl(args: Record<string, unknown>, key: string) {
  const value = requiredString(args, key, 2_048);
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`${key} must be a valid URL`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`${key} must use http or https`);
  }
  if (!url.hostname) throw new Error(`${key} must include a hostname`);
  return value;
}

export function isoTimestamp(
  args: Record<string, unknown>,
  key: string,
  required = false,
) {
  const value = stringValue(args, key, { required, maxLength: 40 });
  if (value == null) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error(`${key} must be a valid ISO 8601 timestamp`);
  }
  return date.toISOString();
}

export function normalizeUrl(raw: string) {
  const url = new URL(raw);
  [
    "utm_source",
    "utm_medium",
    "utm_campaign",
    "utm_term",
    "utm_content",
    "ref",
    "referral",
    "source",
  ].forEach((key) => url.searchParams.delete(key));
  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.pathname = url.pathname.replace(/\/+$/, "") || "/";
  return url.toString().replace(/\?$/, "");
}

export function canonicalKey(officialUrl: string, name: string) {
  const normalizedName = name
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/g, "-")
    .replace(/^-|-$/g, "");
  return `${normalizeUrl(officialUrl)}|${normalizedName}`;
}

export function parseOfferInput(args: Record<string, unknown>) {
  const name = requiredString(args, "name", 240);
  const officialUrl = httpUrl(args, "official_url");
  const startsAt = isoTimestamp(args, "starts_at");
  const endsAt = isoTimestamp(args, "ends_at");
  if (startsAt && endsAt && startsAt > endsAt) {
    throw new Error("ends_at must not be earlier than starts_at");
  }

  const sourceType = enumString(args, "source_type", SOURCE_TYPES);
  const sourceUrl = httpUrl(args, "source_url");
  const sourceHost = new URL(sourceUrl).hostname.toLowerCase().replace(/^www\./, "");
  const sourceSubreddit = optionalString(args, "source_subreddit", 100);
  const sourceAccount = optionalString(args, "source_account", 100);
  const sourceOfficial = booleanValue(args, "source_official");
  const verificationStatus = enumString(
    args,
    "verification_status",
    VERIFICATION_STATUSES,
  );

  if (
    sourceType === "reddit" &&
    sourceHost !== "reddit.com" &&
    !sourceHost.endsWith(".reddit.com") &&
    sourceHost !== "redd.it"
  ) {
    throw new Error("reddit sources must use a reddit.com or redd.it URL");
  }
  if (sourceType === "reddit" && !sourceSubreddit) {
    throw new Error("source_subreddit is required for reddit sources");
  }
  if (
    sourceType === "x" &&
    sourceHost !== "x.com" &&
    !sourceHost.endsWith(".x.com") &&
    sourceHost !== "twitter.com" &&
    !sourceHost.endsWith(".twitter.com")
  ) {
    throw new Error("x sources must use an x.com or twitter.com URL");
  }
  if (sourceType === "x" && !sourceAccount) {
    throw new Error("source_account is required for x sources");
  }
  if (sourceType === "x" && verificationStatus === "verified" && !sourceOfficial) {
    throw new Error("verified x sources must be marked as an official account");
  }
  if (
    sourceType === "reddit" &&
    verificationStatus === "verified" &&
    normalizeUrl(officialUrl) === normalizeUrl(sourceUrl)
  ) {
    throw new Error("reddit-only sources cannot be marked as verified");
  }

  return {
    key: canonicalKey(officialUrl, name),
    name,
    category: enumString(args, "category", DEAL_CATEGORIES),
    summary: requiredString(args, "summary", 4_000),
    valueAmount: optionalAmount(args, "value_amount"),
    valueCurrency: optionalString(args, "value_currency", 12),
    valueLabel: requiredString(args, "value_label", 200),
    valueScore: integerValue(args, "value_score", {
      max: 100,
      fallback: 0,
    }),
    requirements: requiredString(args, "requirements", 4_000),
    regions: requiredString(args, "regions", 1_000),
    hiddenConditions: optionalString(args, "hidden_conditions", 4_000) ?? "",
    startsAt,
    endsAt,
    steps: requiredString(args, "steps", 8_000),
    officialUrl,
    sourceUrl,
    sourceName: requiredString(args, "source_name", 240),
    sourceType,
    sourceSubreddit,
    sourceAccount,
    sourceOfficial,
    verificationStatus,
    status: enumString(args, "status", DEAL_STATUSES),
    confidence: integerValue(args, "confidence", { max: 100 }),
    riskNotes: requiredString(args, "risk_notes", 8_000),
  };
}
