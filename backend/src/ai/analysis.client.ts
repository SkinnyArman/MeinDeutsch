import OpenAI from "openai";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import { MISTAKE_TYPES, type AnalysisResult, type SubmissionInput } from "../types/submission.types.js";
import { AppError } from "../utils/app-error.js";

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

const SYSTEM_PROMPT = `You are a German language coach. Return strict JSON only with this shape:
{
  "correctedText": "string",
  "nativeRewrite": "string",
  "tips": ["string"],
  "errors": [{ "type": "one of taxonomy", "message": "string", "severity": 0-1 }],
  "metrics": {
    "grammarAccuracy": 0-1,
    "lexicalDiversity": 0-1,
    "avgSentenceLength": number,
    "clauseDepth": number
  }
}
Allowed error types: ${MISTAKE_TYPES.join(", ")}.`;

const buildFallbackAnalysis = (input: SubmissionInput, reason: string): AnalysisResult => {
  const words = input.answerText.trim().split(/\s+/).filter(Boolean);
  const sentenceCount = Math.max(1, input.answerText.split(/[.!?]+/).filter((part) => part.trim().length > 0).length);
  const avgSentenceLength = words.length / sentenceCount;

  return {
    correctedText: input.answerText,
    nativeRewrite: input.answerText,
    tips: [`AI fallback mode enabled: ${reason}`],
    errors: [],
    metrics: {
      grammarAccuracy: 0.82,
      lexicalDiversity: Number(Math.min(1, new Set(words.map((w) => w.toLowerCase())).size / Math.max(1, words.length)).toFixed(2)),
      avgSentenceLength: Number(avgSentenceLength.toFixed(2)),
      clauseDepth: 1
    }
  };
};

export const analyzeSubmission = async (input: SubmissionInput): Promise<AnalysisResult> => {
  if (!openai) {
    if (!env.AI_FALLBACK_ENABLED) {
      throw new AppError(503, "AI_CONFIGURATION_MISSING", API_MESSAGES.errors.aiConfigurationMissing, {
        provider: "openai",
        reason: "OPENAI_API_KEY is missing"
      });
    }

    return buildFallbackAnalysis(input, "OPENAI_API_KEY is missing");
  }

  try {
    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      instructions: SYSTEM_PROMPT,
      input: `Prompt: ${input.prompt}\n\nSubmission: ${input.answerText}`,
      text: {
        format: {
          type: "json_schema",
          name: "submission_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["correctedText", "nativeRewrite", "tips", "errors", "metrics"],
            properties: {
              correctedText: { type: "string" },
              nativeRewrite: { type: "string" },
              tips: { type: "array", items: { type: "string" } },
              errors: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["type", "message", "severity"],
                  properties: {
                    type: { type: "string", enum: [...MISTAKE_TYPES] },
                    message: { type: "string" },
                    severity: { type: "number", minimum: 0, maximum: 1 }
                  }
                }
              },
              metrics: {
                type: "object",
                additionalProperties: false,
                required: ["grammarAccuracy", "lexicalDiversity", "avgSentenceLength", "clauseDepth"],
                properties: {
                  grammarAccuracy: { type: "number", minimum: 0, maximum: 1 },
                  lexicalDiversity: { type: "number", minimum: 0, maximum: 1 },
                  avgSentenceLength: { type: "number", minimum: 0 },
                  clauseDepth: { type: "number", minimum: 0 }
                }
              }
            }
          }
        }
      }
    });

    const raw = completion.output_text;
    return JSON.parse(raw) as AnalysisResult;
  } catch (error) {
    logger.error("OpenAI analysis failed", error);

    if (env.AI_FALLBACK_ENABLED) {
      return buildFallbackAnalysis(input, "OpenAI request failed");
    }

    const errorDetails =
      error && typeof error === "object"
        ? {
            status: "status" in error ? (error as { status?: unknown }).status : undefined,
            code: "code" in error ? (error as { code?: unknown }).code : undefined,
            type: "type" in error ? (error as { type?: unknown }).type : undefined
          }
        : undefined;

    const upstreamStatus =
      typeof errorDetails?.status === "number" && errorDetails.status >= 400 && errorDetails.status <= 599
        ? errorDetails.status
        : 502;

    throw new AppError(upstreamStatus, "AI_ANALYSIS_FAILED", API_MESSAGES.errors.aiAnalysisFailed, {
      provider: "openai",
      ...errorDetails
    });
  }
};
