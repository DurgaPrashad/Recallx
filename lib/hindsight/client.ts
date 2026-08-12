import {
  HindsightClient,
  createClient,
  createConfig,
  sdk,
  type RecallResponse,
  type ReflectResponse,
  type RetainResponse,
} from "@vectorize-io/hindsight-client";
import { getEnv } from "@/lib/env";

export type BankStatsResponse = NonNullable<Awaited<ReturnType<typeof sdk.getAgentStats>>["data"]>;

export class HindsightUnavailableError extends Error {
  constructor(cause: unknown) {
    super(`Hindsight is unavailable: ${cause instanceof Error ? cause.message : String(cause)}`);
    this.name = "HindsightUnavailableError";
  }
}

let client: HindsightClient | null = null;
let rawClient: ReturnType<typeof createClient> | null = null;
let bankEnsured: Promise<void> | null = null;

function headers() {
  const env = getEnv();
  return env.HINDSIGHT_API_KEY ? { Authorization: `Bearer ${env.HINDSIGHT_API_KEY}` } : undefined;
}

export function getHindsightClient(): HindsightClient {
  const env = getEnv();
  if (!client) {
    client = new HindsightClient({ baseUrl: env.HINDSIGHT_API_URL, apiKey: env.HINDSIGHT_API_KEY });
  }
  return client;
}

/** Low-level generated client, used only for endpoints not wrapped by HindsightClient (e.g. bank stats). */
function getRawClient() {
  const env = getEnv();
  if (!rawClient) {
    rawClient = createClient(createConfig({ baseUrl: env.HINDSIGHT_API_URL, headers: headers() }));
  }
  return rawClient;
}

function bankId(): string {
  return getEnv().HINDSIGHT_BANK_ID;
}

function assertEnabled() {
  if (getEnv().SKIP_HINDSIGHT) {
    throw new HindsightUnavailableError("SKIP_HINDSIGHT is set");
  }
}

/**
 * Creates the Recall-X memory bank on first use, tuned toward incident
 * troubleshooting. Idempotent — safe to call before every operation.
 */
export async function ensureBank(): Promise<void> {
  assertEnabled();
  if (!bankEnsured) {
    bankEnsured = getHindsightClient()
      .createBank(bankId(), {
        name: "Recall-X Operational Memory",
        reflectMission:
          "You are Recall-X, an on-call incident copilot. Your job is to help engineers avoid " +
          "repeating failed troubleshooting steps and to surface what actually worked in past " +
          "production incidents. Distinguish clearly between what was directly observed in past " +
          "incidents (remembered evidence) and what you are inferring from patterns. Never present " +
          "speculation as certainty. Flag when historical evidence is thin or conflicting.",
        retainMission:
          "Extract concrete incident-response facts: what action an engineer attempted, why they " +
          "tried it (hypothesis), what happened as a result, and whether it solved, partially helped, " +
          "or failed to resolve the incident. Preserve service names, incident IDs, error signatures, " +
          "and timing. Failed and partially-successful attempts ('dead ends') are just as important to " +
          "retain as successful fixes.",
        enableTemporalRetrieval: true,
        enableGraphRetrieval: true,
      })
      .then(() => undefined)
      .catch((err) => {
        bankEnsured = null;
        throw new HindsightUnavailableError(err);
      });
  }
  return bankEnsured;
}

export interface RetainMemoryInput {
  content: string;
  context?: string;
  timestamp?: string;
  tags: string[];
  metadata?: Record<string, string>;
}

export async function retain(input: RetainMemoryInput): Promise<RetainResponse> {
  assertEnabled();
  await ensureBank();
  try {
    return await getHindsightClient().retain(bankId(), input.content, {
      context: input.context,
      timestamp: input.timestamp,
      tags: input.tags,
      metadata: input.metadata,
    });
  } catch (err) {
    throw new HindsightUnavailableError(err);
  }
}

export async function retainBatch(items: RetainMemoryInput[]): Promise<RetainResponse> {
  assertEnabled();
  await ensureBank();
  try {
    return await getHindsightClient().retainBatch(
      bankId(),
      items.map((i) => ({
        content: i.content,
        context: i.context,
        timestamp: i.timestamp,
        tags: i.tags,
        metadata: i.metadata,
      }))
    );
  } catch (err) {
    throw new HindsightUnavailableError(err);
  }
}

export interface RecallInput {
  query: string;
  tags?: string[];
  tagsMatch?: "any" | "all" | "any_strict" | "all_strict" | "exact";
  budget?: "low" | "mid" | "high";
  maxTokens?: number;
}

export async function recall(input: RecallInput): Promise<RecallResponse> {
  assertEnabled();
  try {
    return await getHindsightClient().recall(bankId(), input.query, {
      tags: input.tags,
      tagsMatch: input.tagsMatch,
      budget: input.budget ?? "high",
      maxTokens: input.maxTokens,
    });
  } catch (err) {
    throw new HindsightUnavailableError(err);
  }
}

export interface ReflectInput {
  query: string;
  tags?: string[];
  tagsMatch?: "any" | "all" | "any_strict" | "all_strict" | "exact";
  budget?: "low" | "mid" | "high";
  responseSchema?: Record<string, unknown>;
}

export async function reflect(input: ReflectInput): Promise<ReflectResponse> {
  assertEnabled();
  try {
    return await getHindsightClient().reflect(bankId(), input.query, {
      tags: input.tags,
      tagsMatch: input.tagsMatch,
      budget: input.budget ?? "high",
      responseSchema: input.responseSchema,
      includeFacts: true,
    });
  } catch (err) {
    throw new HindsightUnavailableError(err);
  }
}

export async function getBankStats(): Promise<BankStatsResponse> {
  assertEnabled();
  try {
    const response = await sdk.getAgentStats({
      client: getRawClient(),
      path: { bank_id: bankId() },
    });
    if (!response.data) throw response.error ?? new Error("empty bank stats response");
    return response.data;
  } catch (err) {
    throw new HindsightUnavailableError(err);
  }
}

/** Deletes and re-primes the bank. Used by the seed script for idempotent reseeding. */
export async function resetBank(): Promise<void> {
  assertEnabled();
  try {
    await getHindsightClient().deleteBank(bankId());
  } catch (err) {
    console.warn(`[hindsight] resetBank: delete failed (bank may not exist yet) — ${err}`);
  }
  bankEnsured = null;
  await ensureBank();
}

export async function checkHealth(): Promise<boolean> {
  if (getEnv().SKIP_HINDSIGHT) return false;
  try {
    await getHindsightClient().getVersion();
    return true;
  } catch {
    return false;
  }
}
