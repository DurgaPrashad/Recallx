import type { SeedIncident } from "./types";

// Ordered oldest -> newest. Array index + 1 becomes `demoOrder`, used by Demo
// Mode to progressively "reveal" memory (Stage 1 sees only the first couple,
// Stage 2 sees everything, Stage 3 triggers the hero incident against the
// full history). The hero incident is last and starts with zero attempts.

export const INCIDENTS: SeedIncident[] = [
  // ───────────────────────── 1 ─────────────────────────
  {
    key: "INC-0552",
    service: "payment-service",
    severity: "sev3",
    title: "Payment webhook delivery delays to merchants",
    summary:
      "Merchant-bound webhook deliveries (order.paid, order.refunded) began queueing, with delivery lag climbing past 20 minutes for a subset of merchants.",
    symptoms:
      "Webhook delivery lag alert fired; queue depth for the merchant-webhooks topic grew steadily instead of draining; no impact on checkout or payment success rate itself.",
    alerts: "PagerDuty: webhook-delivery-lag-warning, merchant-webhook-queue-depth-high",
    errorRateStart: 0.1,
    errorRatePeak: 0.3,
    errorRateCurrent: 0.1,
    p95LatencyMs: 640,
    daysAgo: 165,
    hour: 14,
    status: "resolved",
    patternTag: "shared-worker-pool-blocking",
    assignedEngineer: "aisha.khan",
    attempts: [
      {
        action: "Increased webhook worker concurrency",
        hypothesis: "More concurrent workers should drain the backlog faster.",
        outcome: "partial",
        outcomeNotes:
          "Queue depth briefly improved but a handful of merchants kept accumulating retries — the bottleneck wasn't total throughput.",
        startMinute: 6,
        endMinute: 24,
      },
    ],
    resolution: {
      rootCause:
        "A handful of slow or unresponsive merchant endpoints were blocking shared worker pool capacity — each stuck delivery held a worker for the full timeout window, starving unrelated merchants.",
      fixSummary:
        "Added a per-merchant circuit breaker and a dead-letter queue for repeatedly failing webhook endpoints, isolating slow merchants from the shared pool.",
      lessonsLearned:
        "Shared worker pools need per-destination isolation — one slow downstream endpoint shouldn't be able to starve delivery to everyone else.",
      resolvedMinute: 52,
    },
  },

  // ───────────────────────── 2 ─────────────────────────
  {
    key: "INC-0577",
    service: "notification-worker",
    severity: "sev3",
    title: "Notification-worker silently dropping messages after dependency timeout",
    summary:
      "Customer support flagged missing order-confirmation SMS messages. No alerts had fired — the worker was retrying and then discarding messages with no record.",
    symptoms:
      "SMS delivery rate dipped ~4% below baseline with no corresponding error spike; affected messages had exhausted internal retries against the SMS provider API.",
    alerts: "None fired automatically — surfaced via customer support escalation",
    errorRateStart: 0.2,
    errorRatePeak: 0.4,
    errorRateCurrent: 0.1,
    p95LatencyMs: 1200,
    daysAgo: 158,
    hour: 11,
    status: "resolved",
    patternTag: "dependency-timeout",
    assignedEngineer: "devon.reyes",
    attempts: [
      {
        action: "Increased HTTP client timeout for SMS provider calls",
        hypothesis: "Requests might be timing out before the provider responds.",
        outcome: "partial",
        outcomeNotes:
          "Reduced timeout-related retries somewhat, but messages that still exhausted retries were dropped with no record — the visibility gap remained.",
        startMinute: 15,
        endMinute: 40,
      },
    ],
    resolution: {
      rootCause:
        "Messages that exhausted retries were dropped silently with no dead-letter queue or alerting, so delivery failures were invisible until customers complained.",
      fixSummary: "Added a dead-letter queue plus alerting for permanently failed notification deliveries.",
      lessonsLearned:
        "Retry exhaustion must always be observable — a retry policy without a dead-letter path just delays failure invisibly.",
      resolvedMinute: 95,
    },
  },

  // ───────────────────────── 3 ─────────────────────────
  {
    key: "INC-0611",
    service: "auth-service",
    severity: "sev2",
    title: "SSO login failures after identity provider certificate rotation",
    summary:
      "Enterprise customers using SSO began seeing login failures shortly after their identity provider rotated its signing certificate on schedule.",
    symptoms: "SAML assertion validation failures spiking for SSO-enabled tenants; standard email/password logins unaffected.",
    alerts: "PagerDuty: auth-sso-validation-error-rate-critical",
    errorRateStart: 0.5,
    errorRatePeak: 6.8,
    errorRateCurrent: 6.1,
    p95LatencyMs: 410,
    daysAgo: 151,
    hour: 9,
    status: "resolved",
    patternTag: "cert-rotation-cache",
    assignedEngineer: "tom.walsh",
    attempts: [
      {
        action: "Restarted auth-service pods",
        hypothesis: "A stale in-memory cache might clear on restart.",
        outcome: "failed",
        outcomeNotes: "New pods re-fetched and cached the same stale certificate on boot — failures resumed within a minute.",
        startMinute: 8,
        endMinute: 14,
      },
    ],
    resolution: {
      rootCause:
        "auth-service cached the identity provider's signing certificate indefinitely and never detected the scheduled rotation.",
      fixSummary:
        "Forced a refresh of the cached IdP signing certificate and added automatic detection/handling of certificate rotation.",
      lessonsLearned: "Any indefinitely-cached external credential needs an active invalidation path, not just a restart-clears-it assumption.",
      resolvedMinute: 44,
    },
  },

  // ───────────────────────── 4 ─────────────────────────
  {
    key: "INC-0640",
    service: "checkout-api",
    severity: "sev2",
    title: "Checkout API latency during flash-sale traffic ramp",
    summary:
      "A flash-sale promotion drove a 6x traffic spike in under 3 minutes. checkout-api latency climbed and database connections briefly saturated under legitimate load.",
    symptoms: "p95 latency climbed past 3s; database connection pool hit its configured limit; error rate rose moderately as requests queued.",
    alerts: "PagerDuty: checkout-api-p95-latency-critical, postgres-connections-near-limit",
    deployContext: "No recent deploy — traffic-driven, not code-driven.",
    errorRateStart: 0.5,
    errorRatePeak: 5.2,
    errorRateCurrent: 0.6,
    p95LatencyMs: 3100,
    dbConnectionsUsed: 198,
    dbConnectionsLimit: 200,
    daysAgo: 145,
    hour: 12,
    status: "resolved",
    patternTag: "pool-undersized-for-load",
    assignedEngineer: "priya.nair",
    attempts: [
      {
        action: "Enabled request queueing at the load balancer",
        hypothesis: "Smoothing the request burst might relieve pressure on the connection pool.",
        outcome: "partial",
        outcomeNotes: "Reduced error rate somewhat but p95 latency stayed elevated for the duration of the sale — the pool was still undersized for the sustained load.",
        startMinute: 4,
        endMinute: 18,
      },
    ],
    resolution: {
      rootCause:
        "The autoscaler reacted too slowly to the sudden traffic ramp, so the connection pool was undersized for genuinely legitimate load — not a leak.",
      fixSummary: "Added autoscaling headroom and connection-pool pre-warming ahead of scheduled high-traffic events.",
      lessonsLearned:
        "High DB connection usage during a traffic spike isn't automatically a leak — check whether load itself legitimately exceeds current capacity before hunting for a bug.",
      resolvedMinute: 33,
    },
  },

  // ───────────────────────── 5 ─────────────────────────
  {
    key: "INC-0644",
    service: "search-api",
    severity: "sev3",
    title: "Search-api returning stale results after reindex",
    summary: "After a scheduled full reindex, a subset of search traffic intermittently returned results from the old index.",
    symptoms: "Some queries returned discontinued products or missing recently-added ones; issue was intermittent, not universal.",
    alerts: "PagerDuty: search-index-freshness-warning",
    deployContext: "Scheduled nightly reindex job.",
    errorRateStart: 0.1,
    errorRatePeak: 0.2,
    errorRateCurrent: 0.1,
    p95LatencyMs: 220,
    daysAgo: 139,
    hour: 3,
    status: "resolved",
    patternTag: "index-alias-swap",
    assignedEngineer: "marcus.oduya",
    attempts: [
      {
        action: "Restarted search-api pods",
        hypothesis: "A cached index reference in each pod might be stale.",
        outcome: "failed",
        outcomeNotes: "New pods read the same alias mapping and continued intermittently hitting the old index — the problem was server-side, not per-pod caching.",
        startMinute: 20,
        endMinute: 30,
      },
    ],
    resolution: {
      rootCause:
        "The reindex job updated the search alias in two non-atomic steps, leaving a window where some queries hit the old index and some hit the new one.",
      fixSummary: "Fixed the index alias swap to complete atomically as a single alias-update action.",
      lessonsLearned: "Any two-step cutover (alias swap, DNS change, etc.) needs to be atomic or queries will nondeterministically see both states.",
      resolvedMinute: 58,
    },
  },

  // ───────────────────────── 6 ─────────────────────────
  {
    key: "INC-0688",
    service: "inventory-service",
    severity: "sev3",
    title: "Inventory reconciliation batch job timing out",
    summary: "The nightly warehouse reconciliation job began timing out before completion as the product catalog grew.",
    symptoms: "Job runtime crept past its timeout threshold over several weeks before finally failing outright; memory usage on the job pod climbed steadily during each run.",
    alerts: "PagerDuty: inventory-reconciliation-job-failed",
    errorRateStart: 0,
    errorRatePeak: 0,
    errorRateCurrent: 0,
    p95LatencyMs: 0,
    daysAgo: 132,
    hour: 2,
    status: "resolved",
    patternTag: "batch-job-memory",
    assignedEngineer: "lena.fischer",
    attempts: [
      {
        action: "Increased reconciliation job memory limit",
        hypothesis: "Giving the job more headroom should let it finish.",
        outcome: "partial",
        outcomeNotes: "Delayed the OOM by a few nights but the job still eventually timed out as catalog size kept growing — the underlying approach didn't scale.",
        startMinute: 30,
        endMinute: 45,
      },
    ],
    resolution: {
      rootCause: "The reconciliation job loaded the entire inventory table into memory at once, which no longer fit as the catalog grew.",
      fixSummary: "Rewrote the job to process warehouses in bounded batches instead of loading the full inventory table into memory.",
      lessonsLearned: "Increasing a resource limit is a stopgap for an algorithm that doesn't scale, not a fix — batch/stream instead of loading everything at once.",
      resolvedMinute: 180,
    },
  },

  // ───────────────────────── 7 ─────────────────────────
  {
    key: "INC-0701",
    service: "payment-service",
    severity: "sev2",
    title: "Payment charge failures after deploy — timeout regression",
    summary: "Shortly after a routine deploy, a rising share of charge requests began failing with gateway timeout errors.",
    symptoms: "Charge success rate dropped from 99.4% to 95.1%; failures concentrated in requests taking longer than the (recently lowered) client timeout.",
    alerts: "PagerDuty: payment-charge-success-rate-warning",
    deployContext: "Deploy 9f2c114 (payment-service v3.7.2) — 12 minutes before incident: adjusted default gateway client timeout.",
    errorRateStart: 0.6,
    errorRatePeak: 4.9,
    errorRateCurrent: 4.2,
    p95LatencyMs: 2100,
    daysAgo: 126,
    hour: 15,
    status: "resolved",
    patternTag: "deploy-regression",
    assignedEngineer: "aisha.khan",
    attempts: [
      {
        action: "Restarted payment-service pods",
        hypothesis: "Possibly a transient issue that a fresh process would clear.",
        outcome: "failed",
        outcomeNotes: "New pods ran the identical new code with the same lowered timeout — failure rate was unchanged.",
        startMinute: 5,
        endMinute: 9,
      },
    ],
    resolution: {
      rootCause: "The new deploy changed the default gateway client timeout too aggressively, causing legitimately slow (but successful) charges to be cut off.",
      fixSummary: "Rolled back to the previous deployment to restore the prior timeout value.",
      lessonsLearned: "Timeout value changes deserve the same rollout caution as logic changes — they can turn healthy slow requests into failures.",
      resolvedMinute: 21,
    },
  },

  // ───────────────────────── 8 ─────────────────────────
  {
    key: "INC-0705",
    service: "inventory-service",
    severity: "sev3",
    title: "Stale inventory counts causing minor overselling",
    summary: "A small number of overselling incidents were traced back to inventory-service serving cached counts that lagged real warehouse state.",
    symptoms: "Cached stock counts drifted from the warehouse system of record by 10-15 minutes; a handful of orders placed for items that had just sold out.",
    alerts: "PagerDuty: inventory-oversell-alert (customer-support-triggered)",
    errorRateStart: 0.1,
    errorRatePeak: 0.2,
    errorRateCurrent: 0.1,
    p95LatencyMs: 90,
    daysAgo: 119,
    hour: 16,
    status: "resolved",
    patternTag: "stale-cache",
    assignedEngineer: "devon.reyes",
    attempts: [
      {
        action: "Restarted inventory-service pods",
        hypothesis: "A stuck in-process cache might clear on restart.",
        outcome: "failed",
        outcomeNotes: "Counts were cached in Redis, not in-process, so restarting pods had no effect on staleness.",
        startMinute: 10,
        endMinute: 16,
      },
    ],
    resolution: {
      rootCause: "Investigation did not conclusively identify the invalidation bug in the time available; reducing cache TTL was applied as a stopgap.",
      fixSummary: "Reduced cache TTL from 15 minutes to 2 minutes as a stopgap to shrink the staleness window.",
      lessonsLearned:
        "This masked the symptom rather than fixing the underlying invalidation bug — the drift returned at larger scale later (see INC-0940).",
      resolvedMinute: 40,
    },
  },

  // ───────────────────────── 9 ─────────────────────────
  {
    key: "INC-0733",
    service: "auth-service",
    severity: "sev3",
    title: "Elevated 429s for office users after rate-limit config change",
    summary: "After a rate-limit tuning change, a cluster of enterprise office users began seeing intermittent 429 Too Many Requests on login.",
    symptoms: "429 rate limit errors concentrated among a small number of source IPs, each representing many distinct users behind corporate NAT.",
    alerts: "PagerDuty: auth-rate-limit-429-warning",
    deployContext: "Config change: lowered per-key rate limit threshold to reduce brute-force risk.",
    errorRateStart: 0.3,
    errorRatePeak: 3.1,
    errorRateCurrent: 2.4,
    p95LatencyMs: 180,
    daysAgo: 112,
    hour: 10,
    status: "resolved",
    patternTag: "rate-limit-misconfig",
    assignedEngineer: "tom.walsh",
    attempts: [
      {
        action: "Rolled back rate limit config change",
        hypothesis: "The new lower threshold is directly responsible.",
        outcome: "partial",
        outcomeNotes: "429 volume dropped but didn't fully return to baseline, revealing a second, pre-existing issue with the rate limit key.",
        startMinute: 12,
        endMinute: 20,
      },
    ],
    resolution: {
      rootCause: "The rate limiter keyed on source IP only, so NAT'd office users collectively hit a limit meant for a single client.",
      fixSummary: "Fixed the per-IP rate-limit key collision by incorporating a per-session identifier for shared-IP traffic.",
      lessonsLearned: "IP-only rate limiting breaks down for any shared-NAT population (offices, mobile carriers) — key on something more specific to the client.",
      resolvedMinute: 61,
    },
  },

  // ───────────────────────── 10 ─────────────────────────
  {
    key: "INC-0763",
    service: "checkout-api",
    severity: "sev2",
    title: "Checkout API elevated errors — early connection pool pressure",
    summary: "checkout-api error rate and latency crept up over roughly 40 minutes, with database connections trending toward the pool limit.",
    symptoms: "Error rate climbed steadily rather than spiking; p95 latency elevated; database connections used slowly approached the configured limit.",
    alerts: "PagerDuty: checkout-api-error-rate-warning, postgres-connections-elevated",
    errorRateStart: 0.6,
    errorRatePeak: 9.8,
    errorRateCurrent: 1.1,
    p95LatencyMs: 2600,
    dbConnectionsUsed: 184,
    dbConnectionsLimit: 200,
    daysAgo: 105,
    hour: 13,
    status: "resolved",
    patternTag: "connection-pool-exhaustion",
    assignedEngineer: "priya.nair",
    attempts: [
      {
        action: "Restarted application pods",
        hypothesis: "Clearing all connections and starting fresh should relieve pool pressure.",
        outcome: "partial",
        outcomeNotes: "Connections dropped immediately and error rate improved for about 20 minutes, then climbed back up as new connections leaked again.",
        startMinute: 8,
        endMinute: 12,
      },
    ],
    resolution: {
      rootCause:
        "A connection leak in the checkout-api database client was slowly exhausting the pool. The underlying leak was not fully diagnosed under time pressure.",
      fixSummary: "Increased the connection pool limit to buy headroom while the leak was scheduled for deeper investigation.",
      lessonsLearned:
        "Raising the pool limit bought time but didn't address the leak itself — the same pattern recurred at larger scale in INC-1042 roughly 12 weeks later.",
      resolvedMinute: 46,
    },
  },

  // ───────────────────────── 11 ─────────────────────────
  {
    key: "INC-0812",
    service: "auth-service",
    severity: "sev2",
    title: "Auth-service latency spike at token cache expiry",
    summary: "Login latency spiked sharply for about 8 minutes coinciding with a large batch of token cache entries expiring simultaneously.",
    symptoms: "auth-service CPU spiked to 88%; token validation latency climbed; database saw a burst of duplicate validation queries.",
    alerts: "PagerDuty: auth-service-cpu-high, auth-token-validation-latency-warning",
    errorRateStart: 0.4,
    errorRatePeak: 4.2,
    errorRateCurrent: 0.5,
    p95LatencyMs: 1800,
    daysAgo: 96,
    hour: 9,
    status: "resolved",
    patternTag: "token-cache-stampede",
    assignedEngineer: "lena.fischer",
    attempts: [
      {
        action: "Scaled up auth-service replicas",
        hypothesis: "More capacity should absorb the burst.",
        outcome: "failed",
        outcomeNotes: "New replicas hit the same database bottleneck simultaneously — the burst was a synchronized thundering herd, not a raw capacity shortfall.",
        startMinute: 5,
        endMinute: 11,
      },
    ],
    resolution: {
      rootCause: "Token cache entries were issued with synchronized TTLs, causing a large batch to expire at once and stampede the database with duplicate validation lookups.",
      fixSummary: "Staggered cache TTLs (added jitter) to reduce the frequency and size of synchronized expiry batches.",
      lessonsLearned:
        "Staggering TTLs reduced the frequency of stampedes but didn't eliminate them at peak login volume — full protection required actual request coalescing (see INC-1077).",
      resolvedMinute: 34,
    },
  },

  // ───────────────────────── 12 ─────────────────────────
  {
    key: "INC-0820",
    service: "notification-worker",
    severity: "sev2",
    title: "Notification-worker falling behind during flash sale",
    summary: "During a marketing flash-sale blast, transactional notifications (order confirmations, shipping updates) began arriving with 20+ minute delays.",
    symptoms: "Queue lag for the shared notification queue grew steadily; delay affected both transactional and marketing messages equally.",
    alerts: "PagerDuty: notification-queue-lag-critical",
    errorRateStart: 0.2,
    errorRatePeak: 0.5,
    errorRateCurrent: 0.2,
    p95LatencyMs: 1400,
    daysAgo: 88,
    hour: 17,
    status: "resolved",
    patternTag: "worker-backpressure",
    assignedEngineer: "aisha.khan",
    attempts: [
      {
        action: "Increased worker replica count",
        hypothesis: "More workers should drain the queue faster.",
        outcome: "partial",
        outcomeNotes: "Throughput improved slightly but lag kept growing — the real bottleneck was the third-party SMS provider's fixed rate limit, not worker count.",
        startMinute: 7,
        endMinute: 22,
      },
    ],
    resolution: {
      rootCause:
        "The SMS provider's hard rate limit (100 req/s) was the real bottleneck; marketing blasts were starving transactional notifications for the same shared capacity.",
      fixSummary: "Added priority queueing (transactional ahead of marketing) and backpressure on marketing sends during peak load.",
      lessonsLearned: "Scaling workers doesn't help when the bottleneck is a downstream provider's rate limit — prioritize by business criticality instead.",
      resolvedMinute: 51,
    },
  },

  // ───────────────────────── 13 ─────────────────────────
  {
    key: "INC-0829",
    service: "search-api",
    severity: "sev3",
    title: "Search latency degradation — Elasticsearch disk pressure",
    summary: "Search query latency degraded over several hours as the Elasticsearch cluster's data nodes approached disk capacity.",
    symptoms: "Cluster health transitioned from green to yellow; search p95 latency roughly doubled; no outright query failures yet.",
    alerts: "PagerDuty: elasticsearch-cluster-yellow, es-disk-watermark-warning",
    errorRateStart: 0.1,
    errorRatePeak: 0.3,
    errorRateCurrent: 0.1,
    p95LatencyMs: 980,
    daysAgo: 80,
    hour: 20,
    status: "resolved",
    patternTag: "es-cluster-degraded",
    assignedEngineer: "marcus.oduya",
    attempts: [
      {
        action: "Increased search-api pod replicas",
        hypothesis: "More application-layer capacity might absorb the latency increase.",
        outcome: "failed",
        outcomeNotes: "No measurable improvement — the bottleneck was entirely on the Elasticsearch cluster side, not the application layer.",
        startMinute: 15,
        endMinute: 25,
      },
    ],
    resolution: {
      rootCause: "Two data nodes were approaching their disk watermark, degrading query performance cluster-wide as a stopgap protective measure.",
      fixSummary: "Manually deleted old unused indices to free disk space and bring the cluster back to green.",
      lessonsLearned:
        "This freed space but didn't address the underlying shard imbalance driving uneven disk usage — the same class of issue recurred at larger scale in INC-1015.",
      resolvedMinute: 70,
    },
  },

  // ───────────────────────── 14 ─────────────────────────
  {
    key: "INC-0888",
    service: "payment-service",
    severity: "sev1",
    title: "Payment success rate drop after deploy — currency conversion bug",
    summary: "Immediately following a deploy, payment success rate dropped sharply for all non-USD charges.",
    symptoms: "Charge success rate fell from 99.5% to 91%; 500 errors concentrated entirely on /charge requests with non-USD currency codes.",
    alerts: "PagerDuty: payment-charge-success-rate-critical",
    deployContext: "Deploy 4a71bd0 (payment-service v3.9.0) — 6 minutes before incident: refactored currency conversion module.",
    errorRateStart: 0.5,
    errorRatePeak: 9.0,
    errorRateCurrent: 8.6,
    p95LatencyMs: 890,
    daysAgo: 71,
    hour: 11,
    status: "resolved",
    patternTag: "deploy-regression",
    assignedEngineer: "priya.nair",
    attempts: [
      {
        action: "Restarted payment-service pods",
        hypothesis: "Ruling out a transient runtime issue before assuming a code bug.",
        outcome: "failed",
        outcomeNotes: "Identical new code on fresh pods — 500 errors on non-USD charges resumed immediately.",
        startMinute: 3,
        endMinute: 6,
      },
      {
        action: "Scaled up payment-service replicas",
        hypothesis: "Checking whether this was a capacity/contention issue rather than a logic bug.",
        outcome: "failed",
        outcomeNotes: "Error rate was completely unchanged — confirmed this was a deterministic code bug, not a load issue.",
        startMinute: 7,
        endMinute: 10,
      },
    ],
    resolution: {
      rootCause: "The currency conversion refactor introduced a null-pointer bug specifically on the non-USD conversion path.",
      fixSummary: "Rolled back to the previous deployment while the currency conversion bug was fixed in a follow-up patch.",
      lessonsLearned:
        "Confirm whether a fresh deploy is implicated before trying restarts or scaling — both wasted ~7 minutes here on a problem only a rollback could fix.",
      resolvedMinute: 18,
    },
  },

  // ───────────────────────── 15 ─────────────────────────
  {
    key: "INC-0891",
    service: "payment-service",
    severity: "sev2",
    title: "Payment-service latency and DB saturation — looked like a leak, wasn't",
    summary:
      "payment-service error rate and latency rose alongside elevated database connection usage — superficially resembling a connection-pool leak, but the true cause was different.",
    symptoms: "Error rate rose to 6.5%; p95 latency climbed past 3s; database connections elevated (not fully saturated) with a cluster of long-running queries visible.",
    alerts: "PagerDuty: payment-service-error-rate-warning, payment-service-p95-latency-warning, postgres-connections-elevated",
    errorRateStart: 0.8,
    errorRatePeak: 6.5,
    errorRateCurrent: 1.0,
    p95LatencyMs: 3400,
    dbConnectionsUsed: 142,
    dbConnectionsLimit: 200,
    daysAgo: 63,
    hour: 14,
    status: "resolved",
    patternTag: "slow-query-lock-contention",
    assignedEngineer: "aisha.khan",
    attempts: [
      {
        action: "Increased CPU allocation",
        hypothesis: "CPU throttling on the payment-service pods might be the bottleneck.",
        outcome: "failed",
        outcomeNotes: "No meaningful change in latency or error rate after the CPU increase — confirmed the bottleneck was not application-layer compute.",
        startMinute: 10,
        endMinute: 20,
      },
      {
        action: "Restarted application pods",
        hypothesis: "Worth ruling out before digging into query-level analysis.",
        outcome: "failed",
        outcomeNotes: "Connections reset briefly but the long-running queries were re-issued by the next batch job run and latency returned within 6 minutes.",
        startMinute: 22,
        endMinute: 27,
      },
    ],
    resolution: {
      rootCause:
        "An unindexed column used in a nightly batch job's query was causing full table scans that held row locks, blocking normal charge-processing queries. Not a connection leak.",
      fixSummary: "Added the missing index on payments.transaction_id and killed the long-running lock-holding query.",
      lessonsLearned:
        "Elevated DB connections + latency looks identical for a leak and for lock contention from a slow query — check pg_stat_activity for long-running queries before assuming a leak.",
      resolvedMinute: 48,
    },
  },

  // ───────────────────────── 16 ─────────────────────────
  {
    key: "INC-0940",
    service: "inventory-service",
    severity: "sev2",
    title: "Stale inventory counts causing customer-visible overselling",
    summary: "A larger recurrence of the stale-count issue from INC-0705 — inventory counts drifted from the warehouse system, causing multiple overselling incidents in one afternoon.",
    symptoms: "Customers seeing in-stock items that were actually sold out; inventory counts in the cache lagging the warehouse system by up to 25 minutes after partial stock adjustments.",
    alerts: "PagerDuty: inventory-oversell-alert, inventory-cache-staleness-warning",
    errorRateStart: 0.2,
    errorRatePeak: 0.6,
    errorRateCurrent: 0.2,
    p95LatencyMs: 110,
    daysAgo: 54,
    hour: 15,
    status: "resolved",
    patternTag: "stale-cache",
    assignedEngineer: "devon.reyes",
    attempts: [
      {
        action: "Manually invalidated CDN cache",
        hypothesis: "Cached availability responses at the edge might be the source of staleness.",
        outcome: "partial",
        outcomeNotes: "Counts briefly corrected but drifted out of sync again within about two hours — the CDN layer wasn't the root cause.",
        startMinute: 12,
        endMinute: 20,
      },
      {
        action: "Restarted inventory-service pods",
        hypothesis: "Same as the previous incident — worth ruling out again.",
        outcome: "failed",
        outcomeNotes: "No effect, consistent with INC-0705 — confirmed again that the issue is in the invalidation logic, not the process itself.",
        startMinute: 25,
        endMinute: 30,
      },
    ],
    resolution: {
      rootCause:
        "The inventory-update webhook only invalidated the cache on a full stock recount, not on incremental adjustments — so partial updates never propagated.",
      fixSummary: "Fixed cache invalidation to also fire on incremental stock adjustment events, not just full recounts.",
      lessonsLearned:
        "The TTL reduction in INC-0705 was a stopgap that masked this exact bug — always schedule a root-cause follow-up after a stopgap fix, or it will resurface at scale.",
      resolvedMinute: 63,
    },
  },

  // ───────────────────────── 17 ─────────────────────────
  {
    key: "INC-0958",
    service: "notification-worker",
    severity: "sev3",
    title: "Notification-worker memory creeping toward OOM",
    summary: "notification-worker pods began showing steadily increasing memory usage, getting OOM-killed roughly every 8 hours under normal load.",
    symptoms: "Memory usage per pod climbed linearly over each pod's lifetime; message processing lag briefly spiked at each OOM-triggered restart.",
    alerts: "PagerDuty: notification-worker-memory-high, pod-oom-kill-warning",
    errorRateStart: 0.1,
    errorRatePeak: 0.3,
    errorRateCurrent: 0.1,
    p95LatencyMs: 300,
    daysAgo: 46,
    hour: 6,
    status: "resolved",
    patternTag: "memory-leak",
    assignedEngineer: "tom.walsh",
    attempts: [
      {
        action: "Restarted worker deployment",
        hypothesis: "A clean restart resets memory usage while we investigate.",
        outcome: "partial",
        outcomeNotes: "Memory usage reset as expected but resumed the same steady climb — this was a stopgap, not a fix.",
        startMinute: 10,
        endMinute: 15,
      },
    ],
    resolution: {
      rootCause:
        "Investigation under time pressure found the message-deduplication in-memory cache growing without bound, but a full fix wasn't completed this incident.",
      fixSummary: "Added TTL-based eviction to the deduplication cache to bound its growth.",
      lessonsLearned:
        "TTL eviction alone proved insufficient under sustained high message volume — the cache still grew faster than TTL could evict during peak traffic (see INC-1103).",
      resolvedMinute: 120,
    },
  },

  // ───────────────────────── 18 ─────────────────────────
  {
    key: "INC-0966",
    service: "checkout-api",
    severity: "sev2",
    title: "Checkout API CPU spike and elevated latency — retry storm, not connection pool",
    summary:
      "checkout-api CPU usage spiked to 90% with elevated latency and a mild error rate increase, superficially resembling the connection-pool pattern from INC-0763 — but database connections were only moderately elevated, not saturated.",
    symptoms: "CPU usage on checkout-api pods spiked to 90%+; p95 latency elevated; error rate mildly up; database connections used were elevated (~60% of pool) but not saturated.",
    alerts: "PagerDuty: checkout-api-cpu-high, checkout-api-p95-latency-warning",
    errorRateStart: 0.6,
    errorRatePeak: 2.1,
    errorRateCurrent: 0.7,
    p95LatencyMs: 1900,
    dbConnectionsUsed: 118,
    dbConnectionsLimit: 200,
    daysAgo: 39,
    hour: 13,
    status: "resolved",
    patternTag: "retry-storm",
    assignedEngineer: "lena.fischer",
    attempts: [
      {
        action: "Increased connection pool limit",
        hypothesis: "Pattern-matched to the checkout-api connection-pool incidents seen before — assumed the same cause.",
        outcome: "failed",
        outcomeNotes:
          "No effect on CPU or latency — the connection pool was never actually the bottleneck here, this hypothesis was a false lead from over-indexing on the past pattern.",
        startMinute: 6,
        endMinute: 14,
      },
      {
        action: "Restarted application pods",
        hypothesis: "Clearing in-flight retry backlogs might relieve the CPU spike.",
        outcome: "partial",
        outcomeNotes: "CPU dropped briefly as the retry backlog cleared, then spiked again within about 15 minutes as new requests re-triggered the same retry loop.",
        startMinute: 16,
        endMinute: 22,
      },
    ],
    resolution: {
      rootCause:
        "A brief payment-service latency blip caused checkout-api's payment client SDK to retry aggressively with no backoff, amplifying a minor blip into a CPU-bound retry storm.",
      fixSummary: "Added exponential backoff with a circuit breaker to the payment-service client SDK used by checkout-api.",
      lessonsLearned:
        "High CPU plus elevated (but not saturated) DB connections doesn't automatically mean connection-pool exhaustion — check for retry storms and downstream dependency health before reaching for the usual playbook.",
      resolvedMinute: 41,
    },
  },

  // ───────────────────────── 19 ─────────────────────────
  {
    key: "INC-1015",
    service: "search-api",
    severity: "sev2",
    title: "Search outage — Elasticsearch cluster red, shard allocation imbalance",
    summary: "Search latency spiked sharply and a portion of queries began timing out as the Elasticsearch cluster's status flipped from yellow to red.",
    symptoms: "Cluster status red; search timeouts on a subset of shards; two data nodes hit their disk watermark and flipped to read-only.",
    alerts: "PagerDuty: elasticsearch-cluster-red-critical, es-disk-watermark-critical",
    errorRateStart: 1.0,
    errorRatePeak: 12.4,
    errorRateCurrent: 2.0,
    p95LatencyMs: 4100,
    daysAgo: 30,
    hour: 21,
    status: "resolved",
    patternTag: "es-cluster-degraded",
    assignedEngineer: "marcus.oduya",
    attempts: [
      {
        action: "Restarted Elasticsearch data nodes",
        hypothesis: "A restart might clear the read-only flag and rebalance automatically.",
        outcome: "partial",
        outcomeNotes: "Cluster briefly went fully red during the restart before settling back to yellow — disk pressure and shard imbalance were unaffected.",
        startMinute: 8,
        endMinute: 20,
      },
      {
        action: "Increased search-api pod replicas",
        hypothesis: "Consistent with the earlier stopgap in INC-0829 — worth trying again.",
        outcome: "failed",
        outcomeNotes: "No impact, as in INC-0829 — reconfirmed the bottleneck is entirely cluster-side.",
        startMinute: 22,
        endMinute: 28,
      },
    ],
    resolution: {
      rootCause: "Uneven shard allocation caused two data nodes to hit a 92% disk watermark, triggering read-only shard behavior and cluster-wide query failures.",
      fixSummary: "Rebalanced shard allocation across the cluster and added a dedicated data node to relieve disk pressure.",
      lessonsLearned:
        "Deleting old indices (the INC-0829 stopgap) bought time twice but never fixed the underlying shard imbalance — this needed an actual rebalance plus added capacity.",
      resolvedMinute: 55,
    },
  },

  // ───────────────────────── 20 ─────────────────────────
  {
    key: "INC-1042",
    service: "checkout-api",
    severity: "sev1",
    title: "Checkout API degradation — critical error rate, connection pool exhaustion",
    summary:
      "checkout-api error rate climbed sharply alongside database connection saturation, culminating in a full connection-pool exhaustion event.",
    symptoms: "Error rate climbed from 0.6% to 16.2%; p95 latency reached 4.6s; database connections used hit 197/200 (98.5% of pool).",
    alerts: "PagerDuty: checkout-api-error-rate-critical, checkout-api-p95-latency-critical, postgres-connections-near-limit",
    deployContext: "Deploy b3e9a41 (checkout-api v2.11.0) — 55 minutes before incident: added gift-card balance lookup to checkout flow.",
    errorRateStart: 0.6,
    errorRatePeak: 16.2,
    errorRateCurrent: 1.4,
    p95LatencyMs: 4600,
    dbConnectionsUsed: 197,
    dbConnectionsLimit: 200,
    daysAgo: 21,
    hour: 10,
    status: "resolved",
    patternTag: "connection-pool-exhaustion",
    assignedEngineer: "priya.nair",
    attempts: [
      {
        action: "Restarted application pods",
        hypothesis: "Clearing all open connections should relieve pool pressure immediately.",
        outcome: "partial",
        outcomeNotes: "Metrics recovered for about 3 minutes before failing again — the pods reopened just as many connections almost immediately.",
        startMinute: 7,
        endMinute: 11,
      },
      {
        action: "Increased CPU allocation",
        hypothesis: "High latency might be a compute-bound symptom rather than connection-bound.",
        outcome: "failed",
        outcomeNotes: "No meaningful change in latency after the CPU increase — ruled out compute as the bottleneck.",
        startMinute: 14,
        endMinute: 24,
      },
      {
        action: "Rolled back frontend deployment",
        hypothesis: "A recent frontend change might be sending malformed or duplicated requests.",
        outcome: "failed",
        outcomeNotes: "Backend symptoms persisted unchanged after the frontend rollback — confirmed the issue was entirely backend-side.",
        startMinute: 27,
        endMinute: 34,
      },
    ],
    resolution: {
      rootCause:
        "The new gift-card balance lookup added a database call per checkout request that didn't properly release its connection on certain code paths, leaking connections until the pool was exhausted.",
      fixSummary: "Terminated orphaned database connections, increased the connection pool limit as headroom, and fixed the connection leak in the gift-card lookup path.",
      lessonsLearned:
        "This is the same failure class as INC-0763 at much larger scale — the earlier pool-limit increase bought time but never addressed the leak, which resurfaced under a new code path.",
      resolvedMinute: 52,
    },
  },

  // ───────────────────────── 21 ─────────────────────────
  {
    key: "INC-1077",
    service: "auth-service",
    severity: "sev1",
    title: "Auth-service outage — token cache stampede overwhelms database",
    summary: "A large batch of token cache entries expired simultaneously, triggering a thundering-herd of validation queries that overwhelmed the database and caused a near-total login outage.",
    symptoms: "auth-service CPU pinned at 97%+; token validation error rate spiked to 22%; database connections saturated from duplicate validation queries.",
    alerts: "PagerDuty: auth-service-outage-critical, auth-token-validation-error-rate-critical, postgres-connections-near-limit",
    errorRateStart: 0.5,
    errorRatePeak: 22.3,
    errorRateCurrent: 3.0,
    p95LatencyMs: 5200,
    dbConnectionsUsed: 196,
    dbConnectionsLimit: 200,
    daysAgo: 12,
    hour: 9,
    status: "resolved",
    patternTag: "token-cache-stampede",
    assignedEngineer: "lena.fischer",
    attempts: [
      {
        action: "Scaled up auth-service replicas",
        hypothesis: "Consistent with INC-0812 — try adding capacity first.",
        outcome: "failed",
        outcomeNotes: "As in INC-0812, new replicas hit the same saturated database — cost spiked with no improvement in error rate.",
        startMinute: 5,
        endMinute: 12,
      },
      {
        action: "Cleared Redis cache manually",
        hypothesis: "A full cache clear might reset the synchronized expiry pattern.",
        outcome: "failed",
        outcomeNotes:
          "Made things briefly worse — clearing the cache forced every subsequent request to hit the database uncached, intensifying the stampede for several minutes.",
        startMinute: 15,
        endMinute: 19,
      },
    ],
    resolution: {
      rootCause:
        "Synchronized cache expiry (the same root cause as INC-0812, only partially mitigated by TTL jitter) caused a thundering herd of validation requests to hit the database simultaneously.",
      fixSummary:
        "Implemented request coalescing (single-flight) for token validation, so concurrent requests for the same expired entry share one database lookup instead of each issuing their own.",
      lessonsLearned:
        "TTL jitter (the INC-0812 fix) reduced frequency but couldn't fully prevent stampedes at peak volume — request coalescing was the fix that actually eliminated the failure mode.",
      resolvedMinute: 38,
    },
  },

  // ───────────────────────── 22 ─────────────────────────
  {
    key: "INC-1103",
    service: "notification-worker",
    severity: "sev2",
    title: "Notification-worker OOM crash loop under high volume",
    summary: "During a high-volume send window, notification-worker pods began OOM-crashing every 20-30 minutes, causing repeated processing lag spikes.",
    symptoms: "Memory usage per pod climbed rapidly and non-linearly under high message volume; pods OOM-killed and restarted repeatedly; message lag spiked at each crash.",
    alerts: "PagerDuty: notification-worker-memory-critical, pod-oom-kill-warning, notification-queue-lag-warning",
    errorRateStart: 0.2,
    errorRatePeak: 1.1,
    errorRateCurrent: 0.3,
    p95LatencyMs: 2200,
    daysAgo: 5,
    hour: 19,
    status: "resolved",
    patternTag: "memory-leak",
    assignedEngineer: "aisha.khan",
    attempts: [
      {
        action: "Increased worker memory limit",
        hypothesis: "Consistent with prior guidance — more headroom might avoid the OOM entirely under this volume.",
        outcome: "failed",
        outcomeNotes: "Delayed the first OOM by about 10 minutes but crash-looped anyway once volume stayed high — confirmed this is unbounded growth, not just tight sizing.",
        startMinute: 6,
        endMinute: 16,
      },
      {
        action: "Restarted worker deployment",
        hypothesis: "Consistent with INC-0958 — a clean restart as an immediate stopgap.",
        outcome: "partial",
        outcomeNotes: "Bought roughly 2 hours before memory climbed back to crash levels, same pattern as INC-0958 but recurring much faster under this volume.",
        startMinute: 20,
        endMinute: 25,
      },
    ],
    resolution: {
      rootCause:
        "The message-deduplication in-memory cache had no bounded size — TTL eviction (the INC-0958 fix) couldn't keep up once sustained high volume outpaced the eviction rate.",
      fixSummary: "Fixed the unbounded cache growth by adding a hard bounded size (LRU eviction) in addition to the existing TTL eviction.",
      lessonsLearned:
        "TTL alone isn't a substitute for a bounded cache size — under sustained high volume, entries can be created faster than any TTL can evict them.",
      resolvedMinute: 47,
    },
  },

  // ───────────────────────── 23 — HERO (unresolved) ─────────────────────────
  {
    key: "INC-1148",
    service: "checkout-api",
    severity: "sev1",
    title: "Checkout API degradation — critical error rate and DB connection saturation",
    summary:
      "checkout-api error rate is climbing rapidly alongside rising p95 latency and database connections approaching the pool limit.",
    symptoms:
      "Error rate rising from 0.7% toward double digits; p95 latency at 4.8s and climbing; database connections used approaching the configured pool limit.",
    alerts: "PagerDuty: checkout-api-error-rate-critical, checkout-api-p95-latency-critical, postgres-connections-near-limit",
    deployContext:
      "Deploy c8f19a2 (checkout-api v2.14.0) — 42 minutes before incident: added promo-code validation path with an additional database lookup per checkout request.",
    errorRateStart: 0.7,
    errorRatePeak: 18.4,
    errorRateCurrent: 18.4,
    p95LatencyMs: 4800,
    dbConnectionsUsed: 187,
    dbConnectionsLimit: 200,
    daysAgo: 0,
    hour: 0,
    status: "active",
    patternTag: "connection-pool-exhaustion",
    isHero: true,
    assignedEngineer: "marcus.oduya",
    attempts: [],
  },
];
