import OpenAI from "openai";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import { MISTAKE_TYPES, type AnalysisResult, type AssessmentContext, type SubmissionAssessmentInput } from "../types/submission.types.js";
import { AppError } from "../utils/app-error.js";

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

const ANALYSIS_FIELD_CEFR_LEVEL = `"cefrLevel": "A1|A2|B1|B2|C1|C2"`;
const ANALYSIS_FIELD_CORRECTED_TEXT = `"correctedText": "string"`;
const ANALYSIS_FIELD_CONTEXTUAL_WORDS =
  `"contextualWordSuggestions": [{ "word": "string", "description": "string", "examples": ["string"] }]`;
const ANALYSIS_FIELD_TIPS = `"tips": ["string"]`;
const ANALYSIS_FIELD_ERRORS =
  `"errors": [{ "type": "one of taxonomy", "message": "string", "description": "string", "evidence": "string", "correction": "string", "start": 0, "end": 0, "severity": 0-1 }]`;

const SYSTEM_PROMPT = `You are a German language coach. Return strict JSON only with this shape:
{
  ${ANALYSIS_FIELD_CEFR_LEVEL},
  ${ANALYSIS_FIELD_CORRECTED_TEXT},
  ${ANALYSIS_FIELD_CONTEXTUAL_WORDS},
  ${ANALYSIS_FIELD_TIPS},
  ${ANALYSIS_FIELD_ERRORS}
}
Rules:
- CEFR rubric (summarized):
  - A2: very simple SVO clauses, basic connectors (und/aber/weil), mostly present, limited everyday vocab, repetitive short sentences (~5-8 words), many basic errors.
  - B1: some subordinate clauses (dass/weil/wenn), modal verbs, some past (Perfekt or Präteritum haben/sein), broader everyday vocab (work/travel/opinions), errors remain but meaning clear, ~8-12 words.
  - B2: varied structures, subordinate/relative clauses, occasional passive, Konjunktiv II (würde/hätte/wäre), abstract vocab, fewer basic errors, discuss pros/cons, ~12-18 words.
  - B2+: confident complex structures, nominalizations, differentiated vocab, idioms, minimal errors, nuanced opinions, varied connectors.
  - C1: highly complex structures, stylistic variety, sophisticated vocab, implied meaning, almost error-free, long sentences (18-25+).
  - Error guide: A2=many basic errors, B1=some errors in complex parts, B2=few subtle errors, C1=virtually error-free.
- correctedText must be the user's answer fully corrected.
- correctedText must be complete (no truncation) and must not include stray tokens; keep sentence boundaries.
- Do not add new content (no abbreviations, explanations, or parentheticals). Only correct what's already there.
- If unsure about a correction, leave that span unchanged rather than guessing.
- contextualWordSuggestions must include words NOT used by the user, each with a concise meaning/usage description and examples tied to the main subject.
- For nouns, include the article in the word field (e.g. "die Veränderung").
- For verbs, include Perfekt in the word field (e.g. "verändern (Perfekt: hat verändert)") and provide two examples: present and past.
- tips can be grammar, vocabulary, or expression advice; make them actionable.
- If a tip is about the user's text, include the exact excerpt it refers to (quote it).
- Avoid vague tips; every tip must be tied to a concrete example or suggestion.
- If tips mention specific words/phrases, include those words in contextualWordSuggestions.
- Do not mention specific words in tips unless they appear in contextualWordSuggestions.
- errors must be specific: name the wrong word/phrase and the correction, plus a short explanation and the exact excerpt from the user's text.
- evidence must be the incorrect substring exactly as written by the user in answerText (no paraphrase, no corrected form).
- evidence should be a short phrase (3-8 words) that includes the incorrect token(s), not just the single word.
- correction must be the corrected form for the evidence (must differ from evidence).
- For each error, provide character indices (start/end) into the original user answerText for highlighting. start/end must match the evidence substring. If not applicable, return null for start/end.
 - Only include an error if correctedText changes that evidence.
- Every change made in correctedText must have a corresponding error entry with evidence/correction.
- If the answer does not address the question directly, include at least one error with type "relevance" explaining which part of the question was not answered and cite the missing aspect in the message/description.
Allowed error types: ${MISTAKE_TYPES.join(", ")}.`;

const QUESTION_GENERATION_SYSTEM_PROMPT = `You generate exactly one German practice question.
Rules:
- Output strict JSON only.
- Question must be answerable in 3-7 sentences.
- Keep it tied only to the provided topic.
- Respect custom prompt constraints exactly.`;

const EXPRESSION_GENERATION_PROMPT = `Generate exactly one very common everyday English sentence or expression.
Rules:
- Output strict JSON only.
- Target B1+/B2 difficulty.
- Keep it practical and naturally spoken (roughly 5-14 words).
- Prefer natural spoken daily usage (not literary).
- Avoid very basic beginner phrases (e.g. "How are you?", "Where are you from?", "What is your name?").
- Prefer expressions people actually say in daily situations (work, plans, stress, opinions, social situations).
- Do not include profanity.
- No explanation text, only JSON.`;

const EXPRESSION_ASSESSMENT_PROMPT = `You are a German expression coach.
Given an English expression and the user's German attempt, return strict JSON only:
{
  "naturalnessScore": number,
  "feedback": "string",
  "nativeLikeVersion": "string",
  "alternatives": ["string"]
}
Rules:
- naturalnessScore is 0-100.
- 0 means incorrect or hard to understand.
- 100 means fully correct, natural, and how natives would say it.
- feedback must explain what is wrong/right concretely.
- nativeLikeVersion must be a clean, natural German version.
- alternatives can be empty but include useful variants when relevant.
- No CEFR or extra fields.`;

const buildFallbackAnalysis = (reason: string): AnalysisResult => {
  return {
    cefrLevel: "A1",
    correctedText: "",
    contextualWordSuggestions: [],
    tips: [`AI fallback mode enabled: ${reason}`],
    errors: []
  };
};

export const generateQuestion = async (input: {
  topicName: string;
  topicDescription?: string | null;
  cefrTarget?: string;
  generationPrompt: string;
}): Promise<{ questionText: string; cefrTarget: string | null }> => {
  if (!openai) {
    throw new AppError(503, "AI_CONFIGURATION_MISSING", API_MESSAGES.errors.aiConfigurationMissing, {
      provider: "openai",
      reason: "OPENAI_API_KEY is missing"
    });
  }

  try {
    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      instructions: QUESTION_GENERATION_SYSTEM_PROMPT,
      input: [
        `Topic: ${input.topicName}`,
        `Topic description: ${input.topicDescription ?? "None"}`,
        `Target CEFR: ${input.cefrTarget ?? "Not specified"}`,
        `Required generation prompt: ${input.generationPrompt}`
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "generated_question",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["questionText", "cefrTarget"],
            properties: {
              questionText: { type: "string", minLength: 1 },
              cefrTarget: { type: ["string", "null"], enum: ["A1", "A2", "B1", "B2", "C1", "C2", null] }
            }
          }
        }
      }
    });

    return JSON.parse(completion.output_text) as { questionText: string; cefrTarget: string | null };
  } catch (error) {
    logger.error("OpenAI question generation failed", error);
    const status =
      error && typeof error === "object" && "status" in error && typeof (error as { status?: unknown }).status === "number"
        ? ((error as { status: number }).status >= 400 && (error as { status: number }).status <= 599
            ? (error as { status: number }).status
            : 502)
        : 502;

    throw new AppError(status, "AI_QUESTION_GENERATION_FAILED", API_MESSAGES.errors.aiQuestionGenerationFailed);
  }
};

export const generateEverydayExpression = async (): Promise<{ englishText: string; generatedContext: string | null }> => {
  if (!openai) {
    throw new AppError(503, "AI_CONFIGURATION_MISSING", API_MESSAGES.errors.aiConfigurationMissing, {
      provider: "openai",
      reason: "OPENAI_API_KEY is missing"
    });
  }

  try {
    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      instructions: EXPRESSION_GENERATION_PROMPT,
      input: "Generate one common everyday English sentence/expression.",
      text: {
        format: {
          type: "json_schema",
          name: "everyday_expression",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["englishText", "generatedContext"],
            properties: {
              englishText: { type: "string", minLength: 1 },
              generatedContext: { type: ["string", "null"] }
            }
          }
        }
      }
    });
    return JSON.parse(completion.output_text) as { englishText: string; generatedContext: string | null };
  } catch (error) {
    logger.error("OpenAI expression generation failed", error);
    if (env.AI_FALLBACK_ENABLED) {
      return {
        englishText: "I'm bored to death.",
        generatedContext: "everyday_expression_fallback"
      };
    }

    const status =
      error && typeof error === "object" && "status" in error && typeof (error as { status?: unknown }).status === "number"
        ? ((error as { status: number }).status >= 400 && (error as { status: number }).status <= 599
            ? (error as { status: number }).status
            : 502)
        : 502;
    throw new AppError(status, "AI_EXPRESSION_GENERATION_FAILED", API_MESSAGES.errors.aiExpressionGenerationFailed, {
      provider: "openai",
      status: error && typeof error === "object" && "status" in error ? (error as { status?: unknown }).status : undefined,
      code: error && typeof error === "object" && "code" in error ? (error as { code?: unknown }).code : undefined,
      type: error && typeof error === "object" && "type" in error ? (error as { type?: unknown }).type : undefined
    });
  }
};

export interface ExpressionAssessmentResult {
  naturalnessScore: number;
  feedback: string;
  nativeLikeVersion: string;
  alternatives: string[];
}

export const assessExpressionAttempt = async (input: {
  englishText: string;
  userAnswerText: string;
}): Promise<ExpressionAssessmentResult> => {
  if (!openai) {
    throw new AppError(503, "AI_CONFIGURATION_MISSING", API_MESSAGES.errors.aiConfigurationMissing, {
      provider: "openai",
      reason: "OPENAI_API_KEY is missing"
    });
  }

  try {
    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      instructions: EXPRESSION_ASSESSMENT_PROMPT,
      input: `English expression: ${input.englishText}\nGerman attempt: ${input.userAnswerText}`,
      text: {
        format: {
          type: "json_schema",
          name: "expression_assessment",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["naturalnessScore", "feedback", "nativeLikeVersion", "alternatives"],
            properties: {
              naturalnessScore: { type: "number", minimum: 0, maximum: 100 },
              feedback: { type: "string", minLength: 1 },
              nativeLikeVersion: { type: "string", minLength: 1 },
              alternatives: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });
    return JSON.parse(completion.output_text) as ExpressionAssessmentResult;
  } catch (error) {
    logger.error("OpenAI expression assessment failed", error);
    if (env.AI_FALLBACK_ENABLED) {
      return {
        naturalnessScore: 0,
        feedback: "Fallback mode: AI assessment unavailable. Please try again later.",
        nativeLikeVersion: input.userAnswerText,
        alternatives: []
      };
    }

    const status =
      error && typeof error === "object" && "status" in error && typeof (error as { status?: unknown }).status === "number"
        ? ((error as { status: number }).status >= 400 && (error as { status: number }).status <= 599
            ? (error as { status: number }).status
            : 502)
        : 502;
    throw new AppError(status, "AI_EXPRESSION_ASSESSMENT_FAILED", API_MESSAGES.errors.aiExpressionAssessmentFailed, {
      provider: "openai",
      status: error && typeof error === "object" && "status" in error ? (error as { status?: unknown }).status : undefined,
      code: error && typeof error === "object" && "code" in error ? (error as { code?: unknown }).code : undefined,
      type: error && typeof error === "object" && "type" in error ? (error as { type?: unknown }).type : undefined
    });
  }
};

export const analyzeSubmission = async (
  input: SubmissionAssessmentInput,
  context: AssessmentContext
): Promise<AnalysisResult> => {
  if (!openai) {
    if (!env.AI_FALLBACK_ENABLED) {
      throw new AppError(503, "AI_CONFIGURATION_MISSING", API_MESSAGES.errors.aiConfigurationMissing, {
        provider: "openai",
        reason: "OPENAI_API_KEY is missing"
      });
    }

    return buildFallbackAnalysis("OPENAI_API_KEY is missing");
  }

  try {
    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      instructions: SYSTEM_PROMPT,
      input: `Question: ${input.questionText}\n\nSubmission: ${input.answerText}`,
      text: {
        format: {
          type: "json_schema",
          name: "submission_analysis",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["cefrLevel", "correctedText", "contextualWordSuggestions", "tips", "errors"],
            properties: {
              cefrLevel: { type: "string", enum: ["A1", "A2", "B1", "B2", "C1", "C2"] },
              correctedText: { type: "string" },
              contextualWordSuggestions: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["word", "description", "examples"],
                  properties: {
                    word: { type: "string" },
                    description: { type: "string" },
                    examples: { type: "array", items: { type: "string" }, minItems: 1 }
                  }
                }
              },
              tips: { type: "array", items: { type: "string" } },
              errors: {
                type: "array",
                items: {
                  type: "object",
                  additionalProperties: false,
                  required: ["type", "message", "description", "evidence", "correction", "start", "end", "severity"],
                  properties: {
                    type: { type: "string", enum: [...MISTAKE_TYPES] },
                    message: { type: "string" },
                    description: { type: "string" },
                    evidence: { type: "string" },
                    correction: { type: "string" },
                    start: { type: ["number", "null"], minimum: 0 },
                    end: { type: ["number", "null"], minimum: 0 },
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
      return buildFallbackAnalysis("OpenAI request failed");
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
