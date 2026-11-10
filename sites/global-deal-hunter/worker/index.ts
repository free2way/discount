import handler from "vinext/server/fetch-handler";
import { runWithConnectorBinding } from "../lib/connector-context";
import type { ConnectorBinding } from "../lib/connector-contract.mjs";
import {
  DEAL_CATEGORIES,
  DEAL_STATUSES,
  SOURCE_TYPES,
  VERIFICATION_STATUSES,
  enumString,
  integerValue,
  isoTimestamp,
  parseOfferInput,
  requiredString,
} from "../lib/deal-input.mts";

type JsonRpcRequest = {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
};

const toolDefinitions = [
  {
    name: "upsert_offer",
    description: "Create or update one deal. The server deduplicates by normalized official/source URL and deal name.",
    inputSchema: {
      type: "object",
      required: ["name", "category", "summary", "value_label", "requirements", "regions", "steps", "official_url", "source_url", "source_name", "source_type", "verification_status", "status", "confidence", "risk_notes"],
      properties: {
        name: { type: "string" },
        category: { type: "string", enum: DEAL_CATEGORIES },
        summary: { type: "string" },
        value_amount: { type: ["number", "null"] },
        value_currency: { type: ["string", "null"] },
        value_label: { type: "string" },
        value_score: { type: "integer", minimum: 0, maximum: 100 },
        requirements: { type: "string" },
        regions: { type: "string" },
        hidden_conditions: { type: "string" },
        starts_at: { type: ["string", "null"], description: "ISO 8601 when known" },
        ends_at: { type: ["string", "null"], description: "ISO 8601 when known" },
        steps: { type: "string" },
        official_url: { type: "string" },
        source_url: { type: "string" },
        source_name: { type: "string" },
        source_type: { type: "string", enum: SOURCE_TYPES },
        source_subreddit: { type: ["string", "null"] },
        source_account: { type: ["string", "null"], description: "X handle or source account name when applicable" },
        source_official: { type: "boolean", description: "True only when the source account is controlled by the named organization" },
        verification_status: { type: "string", enum: VERIFICATION_STATUSES },
        status: { type: "string", enum: DEAL_STATUSES },
        confidence: { type: "integer", minimum: 0, maximum: 100 },
        risk_notes: { type: "string" },
      },
    },
  },
  {
    name: "archive_expired",
    description: "Mark active offers whose known deadline has passed as expired.",
    inputSchema: { type: "object", properties: { now: { type: "string", description: "ISO 8601; defaults to current time" } } },
  },
  {
    name: "record_scan_run",
    description: "Record the outcome and audit metrics for one collection run.",
    inputSchema: {
      type: "object",
      required: ["started_at", "finished_at", "status", "sources_checked", "candidates_found", "verified_count", "pending_count", "archived_count", "notes"],
      properties: {
        started_at: { type: "string" }, finished_at: { type: "string" }, status: { type: "string" },
        sources_checked: { type: "integer" }, candidates_found: { type: "integer" }, verified_count: { type: "integer" },
        pending_count: { type: "integer" }, archived_count: { type: "integer" }, notes: { type: "string" },
      },
    },
  },
  {
    name: "list_offers",
    description: "Read recently verified offers for quality checks and duplicate detection.",
    inputSchema: {
      type: "object",
      properties: { status: { type: "string" }, category: { type: "string" }, limit: { type: "integer", minimum: 1, maximum: 100 } },
    },
  },
  {
    name: "get_dashboard_summary",
    description: "Read aggregate counts and the latest scan status.",
    inputSchema: { type: "object", properties: {} },
  },
];

function ok(id: JsonRpcRequest["id"], value: unknown) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, result: value });
}

function fail(id: JsonRpcRequest["id"], message: string, code = -32603) {
  return Response.json({ jsonrpc: "2.0", id: id ?? null, error: { code, message } }, { status: code === -32603 ? 500 : 400 });
}

function toolResult(value: unknown, isError = false) {
  return { content: [{ type: "text", text: JSON.stringify(value) }], ...(isError ? { isError: true } : {}) };
}

async function callTool(db: D1Database, name: string, args: Record<string, unknown>) {
  const now = new Date().toISOString();
  if (name === "upsert_offer") {
    const fields = parseOfferInput(args);
    await db.prepare(`INSERT INTO deals (
      canonical_key, name, category, summary, value_amount, value_currency, value_label, value_score, requirements, regions,
      hidden_conditions, starts_at, ends_at, steps, official_url, source_url, source_name, source_type, source_subreddit,
      source_account, source_official, verification_status, status, confidence, risk_notes, first_seen_at, last_verified_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(canonical_key) DO UPDATE SET
      name=excluded.name, category=excluded.category, summary=excluded.summary, value_amount=excluded.value_amount,
      value_currency=excluded.value_currency, value_label=excluded.value_label, value_score=excluded.value_score,
      requirements=excluded.requirements, regions=excluded.regions, hidden_conditions=excluded.hidden_conditions,
      starts_at=excluded.starts_at, ends_at=excluded.ends_at, steps=excluded.steps, official_url=excluded.official_url,
      source_url=excluded.source_url, source_name=excluded.source_name, source_type=excluded.source_type,
      source_subreddit=excluded.source_subreddit, source_account=excluded.source_account, source_official=excluded.source_official,
      verification_status=excluded.verification_status, status=excluded.status,
      confidence=excluded.confidence, risk_notes=excluded.risk_notes, last_verified_at=excluded.last_verified_at, updated_at=excluded.updated_at`)
      .bind(fields.key, fields.name, fields.category, fields.summary, fields.valueAmount, fields.valueCurrency, fields.valueLabel, fields.valueScore,
        fields.requirements, fields.regions, fields.hiddenConditions, fields.startsAt, fields.endsAt, fields.steps, fields.officialUrl,
        fields.sourceUrl, fields.sourceName, fields.sourceType, fields.sourceSubreddit, fields.sourceAccount, fields.sourceOfficial ? 1 : 0,
        fields.verificationStatus, fields.status,
        fields.confidence, fields.riskNotes, now, now, now).run();
    return { saved: true, canonical_key: fields.key, last_verified_at: now };
  }
  if (name === "archive_expired") {
    const cutoff = args.now == null ? now : isoTimestamp(args, "now", true)!;
    const result = await db.prepare("UPDATE deals SET status = 'expired', updated_at = ? WHERE status != 'expired' AND ends_at IS NOT NULL AND ends_at < ?")
      .bind(now, cutoff).run();
    return { archived: result.meta.changes, cutoff };
  }
  if (name === "record_scan_run") {
    const startedAt = isoTimestamp(args, "started_at", true)!;
    const finishedAt = isoTimestamp(args, "finished_at", true)!;
    if (finishedAt < startedAt) {
      throw new Error("finished_at must not be earlier than started_at");
    }
    await db.prepare(`INSERT INTO scan_runs (started_at, finished_at, status, sources_checked, candidates_found, verified_count, pending_count, archived_count, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
      .bind(startedAt, finishedAt, requiredString(args, "status", 40),
        integerValue(args, "sources_checked", { max: 100_000 }), integerValue(args, "candidates_found", { max: 100_000 }), integerValue(args, "verified_count", { max: 100_000 }),
        integerValue(args, "pending_count", { max: 100_000 }), integerValue(args, "archived_count", { max: 100_000 }), requiredString(args, "notes", 8_000)).run();
    return { recorded: true };
  }
  if (name === "list_offers") {
    const conditions: string[] = [];
    const bindings: unknown[] = [];
    if (args.status != null) { conditions.push("status = ?"); bindings.push(enumString(args, "status", DEAL_STATUSES)); }
    if (args.category != null) { conditions.push("category = ?"); bindings.push(enumString(args, "category", DEAL_CATEGORIES)); }
    const limit = integerValue(args, "limit", { min: 1, max: 100, fallback: 40 });
    const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
    const result = await db.prepare(`SELECT * FROM deals ${where} ORDER BY value_score DESC, last_verified_at DESC LIMIT ?`).bind(...bindings, limit).all();
    return result.results;
  }
  if (name === "get_dashboard_summary") {
    const [counts, latest] = await db.batch([
      db.prepare(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN status != 'expired' THEN 1 ELSE 0 END) AS active,
        SUM(CASE WHEN verification_status = 'verified' THEN 1 ELSE 0 END) AS verified,
        SUM(CASE WHEN verification_status = 'pending' THEN 1 ELSE 0 END) AS pending
        FROM deals`),
      db.prepare("SELECT * FROM scan_runs ORDER BY finished_at DESC LIMIT 1"),
    ]);
    return { counts: counts.results[0] ?? {}, latest_scan: latest.results[0] ?? null };
  }
  throw new Error(`Unknown tool: ${name}`);
}

async function handleMcp(request: Request, env: Cloudflare.Env) {
  let body: JsonRpcRequest;
  try { body = await request.json<JsonRpcRequest>(); } catch { return fail(null, "Invalid JSON", -32700); }
  if (body.method === "server/discover") return ok(body.id, { supportedVersions: ["2026-07-28"], capabilities: { tools: {} } });
  if (body.method === "tools/list") return ok(body.id, { tools: toolDefinitions });
  if (body.method === "tools/call") {
    if (!body.params?.name) return fail(body.id, "Missing tool name", -32602);
    if (!env.DB) return fail(body.id, "Database binding is unavailable");
    try {
      const value = await callTool(env.DB, body.params.name, body.params.arguments ?? {});
      return ok(body.id, toolResult(value));
    } catch (error) {
      return ok(body.id, toolResult({ error: error instanceof Error ? error.message : String(error) }, true));
    }
  }
  return fail(body.id, "Method not found", -32601);
}

const worker = {
  fetch(request: Request, env: Cloudflare.Env, ctx: ExecutionContext<{ CONNECTORS?: ConnectorBinding }>) {
    const url = new URL(request.url);
    if (url.pathname === "/mcp" && request.method === "POST") return handleMcp(request, env);

    let binding = ctx.props?.CONNECTORS;
    if (import.meta.env.DEV && !binding && env.CONNECTORS) {
      const preview = env.CONNECTORS;
      const expiresAt = Date.now() + 60_000;
      binding = {
        async getContext() {
          if (Date.now() >= expiresAt) return { status: "request_context_expired" };
          return preview.getContext?.() ?? { status: "binding_unavailable" };
        },
        async invoke(connectorId, actionName, args) {
          if (Date.now() >= expiresAt) return { status: "request_context_expired", message: "This request has expired. Please try again." };
          return preview.invoke(connectorId, actionName, args);
        },
      };
    }
    return runWithConnectorBinding(binding, () => handler.fetch(request, env, ctx));
  },
};

export default worker;
