import OpenAI from "openai";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import { MISTAKE_TYPES, type AnalysisResult, type SubmissionInput } from "../types/submission.types.js";
import { AppError } from "../utils/app-error.js";

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

const SYSTEM_PROMPT = `You are a German language coach. Return strict JSON only with this shape:
{
  "cefrLevel": "A1|A2|B1|B2|C1|C2",
  "tips": ["string"],
  "errors": [{ "type": "one of taxonomy", "message": "string", "severity": 0-1 }]
}
Allowed error types: ${MISTAKE_TYPES.join(", ")}.`;

const buildFallbackAnalysis = (input: SubmissionInput, reason: string): AnalysisResult => {
  return {
    cefrLevel: "A1",
    tips: [`AI fallback mode enabled: ${reason}`],
    errors: []
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
            required: ["cefrLevel", "tips", "errors"],
            properties: {
              cefrLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
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
