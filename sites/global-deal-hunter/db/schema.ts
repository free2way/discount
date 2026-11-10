import { index, integer, real, sqliteTable, text, uniqueIndex } from "drizzle-orm/sqlite-core";

export const deals = sqliteTable(
  "deals",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    canonicalKey: text("canonical_key").notNull(),
    name: text("name").notNull(),
    category: text("category").notNull(),
    summary: text("summary").notNull(),
    valueAmount: real("value_amount"),
    valueCurrency: text("value_currency"),
    valueLabel: text("value_label").notNull(),
    valueScore: integer("value_score").notNull().default(0),
    requirements: text("requirements").notNull(),
    regions: text("regions").notNull(),
    hiddenConditions: text("hidden_conditions").notNull().default(""),
    startsAt: text("starts_at"),
    endsAt: text("ends_at"),
    steps: text("steps").notNull(),
    officialUrl: text("official_url").notNull(),
    sourceUrl: text("source_url").notNull(),
    sourceName: text("source_name").notNull(),
    sourceType: text("source_type").notNull(),
    sourceSubreddit: text("source_subreddit"),
    sourceAccount: text("source_account"),
    sourceOfficial: integer("source_official", { mode: "boolean" }).notNull().default(false),
    verificationStatus: text("verification_status").notNull().default("pending"),
    status: text("status").notNull().default("active"),
    confidence: integer("confidence").notNull().default(0),
    riskNotes: text("risk_notes").notNull().default(""),
    firstSeenAt: text("first_seen_at").notNull(),
    lastVerifiedAt: text("last_verified_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("deals_canonical_key_unique").on(table.canonicalKey),
    index("deals_status_idx").on(table.status),
    index("deals_category_idx").on(table.category),
    index("deals_ends_at_idx").on(table.endsAt),
    index("deals_value_score_idx").on(table.valueScore),
  ],
);

export const scanRuns = sqliteTable(
  "scan_runs",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at").notNull(),
    status: text("status").notNull(),
    sourcesChecked: integer("sources_checked").notNull().default(0),
    candidatesFound: integer("candidates_found").notNull().default(0),
    verifiedCount: integer("verified_count").notNull().default(0),
    pendingCount: integer("pending_count").notNull().default(0),
    archivedCount: integer("archived_count").notNull().default(0),
    notes: text("notes").notNull().default(""),
  },
  (table) => [index("scan_runs_finished_at_idx").on(table.finishedAt)],
);

export const dealEvidence = sqliteTable(
  "deal_evidence",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    dealId: integer("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    sourceUrl: text("source_url").notNull(),
    sourceName: text("source_name").notNull(),
    sourceType: text("source_type").notNull(),
    sourceAccount: text("source_account"),
    sourceSubreddit: text("source_subreddit"),
    sourceOfficial: integer("source_official", { mode: "boolean" }).notNull().default(false),
    verificationStatus: text("verification_status").notNull().default("pending"),
    excerpt: text("excerpt").notNull().default(""),
    contentHash: text("content_hash").notNull(),
    observedAt: text("observed_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("deal_evidence_deal_url_unique").on(table.dealId, table.sourceUrl),
    index("deal_evidence_deal_idx").on(table.dealId),
    index("deal_evidence_status_idx").on(table.verificationStatus),
  ],
);

export const dealVersions = sqliteTable(
  "deal_versions",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    dealId: integer("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    contentHash: text("content_hash").notNull(),
    snapshotJson: text("snapshot_json").notNull(),
    changedFieldsJson: text("changed_fields_json").notNull().default("[]"),
    verificationStatus: text("verification_status").notNull(),
    verifiedAt: text("verified_at").notNull(),
  },
  (table) => [
    uniqueIndex("deal_versions_deal_hash_unique").on(table.dealId, table.contentHash),
    index("deal_versions_deal_verified_idx").on(table.dealId, table.verifiedAt),
  ],
);

export const reviewCandidates = sqliteTable(
  "review_candidates",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    candidateKey: text("candidate_key").notNull(),
    sourceId: text("source_id").notNull(),
    sourceName: text("source_name").notNull(),
    sourceUrl: text("source_url").notNull(),
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    relevanceScore: integer("relevance_score").notNull().default(0),
    riskScore: integer("risk_score").notNull().default(0),
    riskFlagsJson: text("risk_flags_json").notNull().default("[]"),
    reviewStatus: text("review_status").notNull().default("queued"),
    reviewNotes: text("review_notes").notNull().default(""),
    firstSeenAt: text("first_seen_at").notNull(),
    lastSeenAt: text("last_seen_at").notNull(),
    reviewedAt: text("reviewed_at"),
    reviewedBy: text("reviewed_by"),
  },
  (table) => [
    uniqueIndex("review_candidates_key_unique").on(table.candidateKey),
    index("review_candidates_status_idx").on(table.reviewStatus, table.relevanceScore),
  ],
);

export const sourceHealth = sqliteTable(
  "source_health",
  {
    sourceId: text("source_id").primaryKey(),
    sourceName: text("source_name").notNull(),
    status: text("status").notNull(),
    consecutiveFailures: integer("consecutive_failures").notNull().default(0),
    lastAttemptAt: text("last_attempt_at").notNull(),
    lastSuccessAt: text("last_success_at"),
    lastError: text("last_error"),
    itemsFound: integer("items_found").notNull().default(0),
    responseMs: integer("response_ms").notNull().default(0),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [index("source_health_status_idx").on(table.status, table.consecutiveFailures)],
);

export const userPreferences = sqliteTable("user_preferences", {
  userId: text("user_id").primaryKey(),
  regionsJson: text("regions_json").notNull().default("[]"),
  eligibilityJson: text("eligibility_json").notNull().default("[]"),
  deadlineDays: integer("deadline_days").notNull().default(3),
  notifyDealChanges: integer("notify_deal_changes", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const userFavorites = sqliteTable(
  "user_favorites",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    dealId: integer("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("user_favorites_user_deal_unique").on(table.userId, table.dealId),
    index("user_favorites_user_idx").on(table.userId),
  ],
);

export const dealAlerts = sqliteTable(
  "deal_alerts",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    userId: text("user_id").notNull(),
    dealId: integer("deal_id").notNull().references(() => deals.id, { onDelete: "cascade" }),
    alertType: text("alert_type").notNull(),
    deadlineDays: integer("deadline_days"),
    baselineValueLabel: text("baseline_value_label"),
    enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [
    uniqueIndex("deal_alerts_user_deal_type_unique").on(table.userId, table.dealId, table.alertType),
    index("deal_alerts_enabled_idx").on(table.enabled, table.alertType),
  ],
);

export const notificationEvents = sqliteTable(
  "notification_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    eventKey: text("event_key").notNull(),
    userId: text("user_id").notNull(),
    dealId: integer("deal_id").references(() => deals.id, { onDelete: "set null" }),
    alertId: integer("alert_id").references(() => dealAlerts.id, { onDelete: "set null" }),
    eventType: text("event_type").notNull(),
    payloadJson: text("payload_json").notNull().default("{}"),
    deliveryStatus: text("delivery_status").notNull().default("queued"),
    createdAt: text("created_at").notNull(),
    deliveredAt: text("delivered_at"),
  },
  (table) => [
    uniqueIndex("notification_events_key_unique").on(table.eventKey),
    index("notification_events_delivery_idx").on(table.deliveryStatus, table.createdAt),
  ],
);
