import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

export const services = sqliteTable("services", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  tier: text("tier").notNull().default("tier-1"),
  description: text("description"),
});

export const engineers = sqliteTable("engineers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  handle: text("handle").notNull(),
  role: text("role").notNull().default("On-call engineer"),
});

// severity: sev1 | sev2 | sev3
// status: active | monitoring | resolved
export const incidents = sqliteTable("incidents", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(), // e.g. INC-1042
  title: text("title").notNull(),
  serviceId: text("service_id")
    .notNull()
    .references(() => services.id),
  severity: text("severity").notNull().$type<"sev1" | "sev2" | "sev3">(),
  status: text("status").notNull().default("active").$type<"active" | "monitoring" | "resolved">(),
  summary: text("summary").notNull(),
  symptoms: text("symptoms").notNull(), // free text, bullet-joined
  alerts: text("alerts").notNull(), // free text, bullet-joined
  deployContext: text("deploy_context"),
  errorRateStart: real("error_rate_start"),
  errorRatePeak: real("error_rate_peak"),
  errorRateCurrent: real("error_rate_current"),
  p95LatencyMs: integer("p95_latency_ms"),
  dbConnectionsUsed: integer("db_connections_used"),
  dbConnectionsLimit: integer("db_connections_limit"),
  assignedEngineerId: text("assigned_engineer_id").references(() => engineers.id),
  startedAt: text("started_at").notNull(), // ISO
  resolvedAt: text("resolved_at"),
  isHero: integer("is_hero", { mode: "boolean" }).notNull().default(false),
  demoOrder: integer("demo_order").notNull().default(999),
  patternTag: text("pattern_tag"), // recurring root-cause slug, e.g. connection-pool-exhaustion
  createdAt: text("created_at").notNull(),
});

export const metricSnapshots = sqliteTable("metric_snapshots", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id")
    .notNull()
    .references(() => incidents.id),
  timestamp: text("timestamp").notNull(),
  errorRate: real("error_rate").notNull(),
  p95LatencyMs: integer("p95_latency_ms").notNull(),
  dbConnections: integer("db_connections"),
  cpuPercent: real("cpu_percent"),
});

// type: alert | note | action | observation | hypothesis | resolution
export const timelineEvents = sqliteTable("timeline_events", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id")
    .notNull()
    .references(() => incidents.id),
  timestamp: text("timestamp").notNull(),
  type: text("type").notNull().$type<"alert" | "note" | "action" | "observation" | "hypothesis" | "resolution">(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  attemptId: text("attempt_id"),
  createdAt: text("created_at").notNull(),
});

// outcome: solved | partial | failed | inconclusive | pending
export const attempts = sqliteTable("attempts", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id")
    .notNull()
    .references(() => incidents.id),
  action: text("action").notNull(),
  hypothesis: text("hypothesis"),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  outcome: text("outcome").notNull().default("pending").$type<"solved" | "partial" | "failed" | "inconclusive" | "pending">(),
  outcomeNotes: text("outcome_notes"),
  orderIndex: integer("order_index").notNull().default(0),
  memorySynced: integer("memory_synced", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const resolutions = sqliteTable("resolutions", {
  id: text("id").primaryKey(),
  incidentId: text("incident_id")
    .notNull()
    .references(() => incidents.id)
    .unique(),
  rootCause: text("root_cause").notNull(),
  fixSummary: text("fix_summary").notNull(),
  lessonsLearned: text("lessons_learned"),
  timeToResolutionMin: integer("time_to_resolution_min"),
  memorySynced: integer("memory_synced", { mode: "boolean" }).notNull().default(false),
  createdAt: text("created_at").notNull(),
});

export const briefCache = sqliteTable("brief_cache", {
  incidentId: text("incident_id").primaryKey(),
  generatedAt: text("generated_at").notNull(),
  json: text("json").notNull(),
  source: text("source").notNull().default("live"), // live | fallback
});
