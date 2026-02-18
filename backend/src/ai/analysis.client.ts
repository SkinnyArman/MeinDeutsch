import OpenAI from "openai";
import { env } from "../config/env.js";
import { MISTAKE_TYPES, type AnalysisResult, type SubmissionInput } from "../types/submission.types.js";

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

export const analyzeSubmission = async (input: SubmissionInput): Promise<AnalysisResult> => {
  if (!openai) {
    return {
      correctedText: input.answerText,
      nativeRewrite: input.answerText,
      tips: ["Add OPENAI_API_KEY to enable real AI coaching."],
      errors: [],
      metrics: {
        grammarAccuracy: 0.8,
        lexicalDiversity: 0.5,
        avgSentenceLength: 8,
        clauseDepth: 1
      }
    };
  }

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
};
