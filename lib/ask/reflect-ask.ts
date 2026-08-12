import * as hindsight from "@/lib/hindsight/client";
import { HindsightUnavailableError } from "@/lib/hindsight/client";
import { tags as tagBuilders } from "@/lib/memory/tags";

export interface AskEvidence {
  incidentKey: string;
  fact: string;
}

export interface AskAnswer {
  question: string;
  answerMarkdown: string;
  remembered: AskEvidence[];
  inferenceNote: string | null;
  source: "live" | "fallback";
}

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    answer: {
      type: "string",
      description:
        "Direct, specific markdown answer to the engineer's question. Ground it in the retrieved memories. " +
        "If memory is insufficient, say so plainly instead of guessing.",
    },
    remembered: {
      type: "array",
      description:
        "Concrete facts directly retrieved from memory that support the answer. Empty array if none apply.",
      items: {
        type: "object",
        properties: {
          incident_key: { type: "string", description: "e.g. INC-1042. Must come from retrieved memory, never invented." },
          fact: { type: "string", description: "The specific remembered fact, in one sentence." },
        },
        required: ["incident_key", "fact"],
      },
    },
    inference_note: {
      type: ["string", "null"],
      description:
        "Any reasoning that goes beyond directly-remembered facts (a hypothesis, a pattern you're inferring). " +
        "Null if the answer is purely remembered fact with no added inference.",
    },
  },
  required: ["answer", "remembered", "inference_note"],
};

interface StructuredAskOutput {
  answer: string;
  remembered: Array<{ incident_key: string; fact: string }>;
  inference_note: string | null;
}

export interface AskParams {
  question: string;
  serviceSlug?: string;
  incidentKey?: string;
}

/**
 * Powers "Ask Recall-X". Uses Hindsight's reflect() directly with a JSON
 * response_schema — the retrieval AND the remembered/inference distinction
 * both come from Hindsight's own agentic reflection over the memory bank,
 * not a separate hand-rolled pipeline.
 */
export async function askRecallX(params: AskParams): Promise<AskAnswer> {
  const { question, serviceSlug, incidentKey } = params;
  const tagFilters: string[] = [];
  if (serviceSlug) tagFilters.push(tagBuilders.service(serviceSlug));
  if (incidentKey) tagFilters.push(tagBuilders.incident(incidentKey));

  try {
    const response = await hindsight.reflect({
      query: question,
      tags: tagFilters.length ? tagFilters : undefined,
      tagsMatch: "any",
      budget: "high",
      responseSchema: RESPONSE_SCHEMA,
    });

    const structured = response.structured_output as unknown as StructuredAskOutput | undefined;
    if (!structured) {
      return {
        question,
        answerMarkdown: response.text,
        remembered: [],
        inferenceNote: null,
        source: "live",
      };
    }

    return {
      question,
      answerMarkdown: structured.answer,
      remembered: structured.remembered.map((r) => ({ incidentKey: r.incident_key, fact: r.fact })),
      inferenceNote: structured.inference_note,
      source: "live",
    };
  } catch (err) {
    if (!(err instanceof HindsightUnavailableError)) throw err;
    return {
      question,
      answerMarkdown:
        "Recall-X's memory service (Hindsight) is currently unreachable, so I can't search historical " +
        "incidents right now. Check that Hindsight is running (see README) and try again.",
      remembered: [],
      inferenceNote: null,
      source: "fallback",
    };
  }
}
