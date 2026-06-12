import OpenAI from "openai";
import { logger } from "../config/logger.js";
import { env } from "../config/env.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import {
  EXPRESSION_CATEGORIES,
  EXPRESSION_CATEGORY_BY_ID,
  EXPRESSION_GENERATION_CATEGORIES,
  EXPRESSION_TARGET_CONTEXTS,
  EXPRESSION_TARGET_TYPES,
  type ExpressionGenerationCategory
} from "../constants/expression-generation.config.js";
import {
  COLLOCATION_CATEGORY_BY_ID,
  COLLOCATION_TARGET_CONTEXTS,
  COLLOCATION_TYPES,
  type CollocationGenerationCategory
} from "../constants/collocation-generation.config.js";
import { MISTAKE_TYPES, type AnalysisResult, type AssessmentContext, type SubmissionAssessmentInput } from "../types/submission.types.js";
import { AppError } from "../utils/app-error.js";

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;
export { EXPRESSION_GENERATION_CATEGORIES };
export type { ExpressionGenerationCategory };

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

const EXPRESSION_TYPES_LIST = EXPRESSION_TARGET_TYPES.join(", ");
const EXPRESSION_CONTEXTS_LIST = EXPRESSION_TARGET_CONTEXTS.join(", ");
const EXPRESSION_CATEGORIES_LIST = EXPRESSION_CATEGORIES.map((category) => `${category.id}: ${category.label}`).join("; ");

const EXPRESSION_GENERATION_PROMPT = `You create ONE situational speaking prompt for a German learner.
Given a concrete everyday situation (in German), the learner produces the natural German thing a native would actually say in that moment.
Output strict JSON only with: situationText, englishText, generatedContext.
Rules for situationText (the main prompt, in GERMAN):
- A short, concrete, real-life micro-scenario of 1 sentence (max ~20 words) ending by implying what the learner should say.
- Frame it as a situation, e.g. "Ein Freund hat morgen eine wichtige Prüfung. Was wünschst du ihm?" or "Du kommst zu spät zur Arbeit und entschuldigst dich kurz. Was sagst du?".
- Keep the SCENARIO wording simple (A2-B1 reading level) even when the target expression itself is idiomatic. Do not write literary or abstract scenarios.
- The situation must have a clear, natural spoken answer (an idiom, fixed phrase, social formula, reaction, or short everyday utterance).
Rules for englishText (a HINT, in English):
- The natural English version of what the learner should say (e.g. "Break a leg!", "Sorry I'm late."). This is shown only as an optional hint, so keep it to the utterance itself.
Rules for nativeAnswer (in GERMAN):
- The natural German utterance a native would say in this situation (3-12 words, spoken register). This is the gold-standard answer.
Rules for distractors (array of exactly 3, in GERMAN):
- Three WRONG-but-plausible German utterances for a multiple-choice recognition step.
- Each must be clearly not what a native would say HERE: e.g. wrong register, a literal/English-transfer phrasing, right words but wrong meaning, or a related-but-inappropriate response.
- Similar length/shape to nativeAnswer so the choice is non-trivial. Never duplicate nativeAnswer.
Other rules:
- The expected German answer should be roughly 3-12 words; natural spoken register, NOT literary.
- Available expression types: ${EXPRESSION_TYPES_LIST}
- Available contexts: ${EXPRESSION_CONTEXTS_LIST}
- Categories: ${EXPRESSION_CATEGORIES_LIST}
- Vary heavily across requests and across contexts/types; include idioms/proverbs/fixed phrases regularly.
- Avoid very basic beginner content (greetings, "What is your name?").
- Casual everyday profanity is allowed in moderation when natural (frustration, surprise, emphasis).
- Keep profanity realistic and commonly spoken, not extreme.
- Strict anti-repetition: do not output any sentence that is identical or near-identical to entries provided in "Avoid list".
- If the first candidate is too similar to avoid-list items, generate a different one instead.
- Return generatedContext as a short lowercase label like "idiom_social", "proverb_time", "casual_emotion", "planning_travel".
- No explanation text, only JSON.`;

const pickRandom = <T>(arr: readonly T[]): T => arr[Math.floor(Math.random() * arr.length)] as T;

export const resolveExpressionGenerationTargets = (
  category: ExpressionGenerationCategory
): { targetType: string; targetContext: string } => {
  const config = EXPRESSION_CATEGORY_BY_ID[category];
  const categoryContexts = config?.targetContexts?.length ? config.targetContexts : [...EXPRESSION_TARGET_CONTEXTS];
  const categoryTypes = config?.targetTypes?.length ? config.targetTypes : [...EXPRESSION_TARGET_TYPES];

  return {
    targetType: pickRandom(categoryTypes),
    targetContext: pickRandom(categoryContexts)
  };
};

const EXPRESSION_ASSESSMENT_PROMPT = `You are a German expression coach.
The learner is given an everyday SITUATION and must say the natural German thing a native would say in that moment.
Given the situation, an English hint, and the learner's German attempt, return strict JSON only:
{
  "naturalnessScore": number,
  "feedback": "string",
  "nativeLikeVersion": "string",
  "alternatives": ["string"]
}
Rules:
- Judge whether the attempt is what a native would naturally SAY in this situation — not whether it is a literal translation of the English hint.
- Reward any natural, situationally appropriate response; do not punish a learner for phrasing it differently from the hint as long as it fits.
- naturalnessScore is 0-100. 0 = wrong register/meaning or not something a native would say here; 100 = fully natural and idiomatic for this situation.
- feedback should be concrete and about word choice/naturalness; empty string if fully correct and natural.
- nativeLikeVersion must be a clean, natural German utterance for this situation.
- alternatives can be empty but include other natural ways to say it when relevant.
- No CEFR or extra fields.`;

const EXPRESSION_REVIEW_ASSESSMENT_PROMPT = `You are a German expression coach in review mode.
Given an English expression and the user's German attempt, return strict JSON only:
{
  "naturalnessScore": number,
  "feedback": "string"
}
Rules:
- naturalnessScore is 0-100.
- Use the provided reference native-like version as the PRIMARY gold standard for scoring.
- Score based on semantic equivalence, idiomaticity, and closeness to the reference wording/register.
- Do not reward alternate phrasings if they drift from the reference's natural register or intent.
- If the attempt is valid but less natural than the reference, cap score below 90 and explain why briefly.
- Keep feedback concise (max 2 sentences) and concrete.
- If fully correct and near-native relative to the reference, feedback can be empty or a very short confirmation.
- Focus only on what still needs fixing or what improved.
- Do not return nativeLikeVersion or alternatives in review mode.
- No extra fields.`;

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
  avoidQuestionTexts?: string[];
}): Promise<{ questionText: string; cefrTarget: string | null }> => {
  if (!openai) {
    throw new AppError(503, "AI_CONFIGURATION_MISSING", API_MESSAGES.errors.aiConfigurationMissing, {
      provider: "openai",
      reason: "OPENAI_API_KEY is missing"
    });
  }

  const avoidList = (input.avoidQuestionTexts ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 50);

  try {
    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      instructions: QUESTION_GENERATION_SYSTEM_PROMPT,
      input: [
        `Topic: ${input.topicName}`,
        `Topic description: ${input.topicDescription ?? "None"}`,
        `Target CEFR: ${input.cefrTarget ?? "Not specified"}`,
        `Required generation prompt: ${input.generationPrompt}`,
        `Avoid list (must not repeat): ${avoidList.length > 0 ? avoidList.join(" | ") : "none"}`
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

export const generateEverydayExpression = async (
  category: ExpressionGenerationCategory = "random",
  options?: { avoidEnglishTexts?: string[] }
): Promise<{
  englishText: string;
  situationText: string | null;
  nativeAnswer: string | null;
  distractors: string[];
  generatedContext: string | null;
}> => {
  if (!openai) {
    throw new AppError(503, "AI_CONFIGURATION_MISSING", API_MESSAGES.errors.aiConfigurationMissing, {
      provider: "openai",
      reason: "OPENAI_API_KEY is missing"
    });
  }

  try {
    const { targetType, targetContext } = resolveExpressionGenerationTargets(category);
    const avoidList = (options?.avoidEnglishTexts ?? [])
      .map((item) => item.trim())
      .filter((item) => item.length > 0)
      .slice(0, 50);
    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      instructions: EXPRESSION_GENERATION_PROMPT,
      input: [
        "Create one situational speaking prompt.",
        `Selected category: ${category}`,
        `Target expression type: ${targetType}`,
        `Target context: ${targetContext}`,
        "Use the selected category as a hard constraint and target type/context as strong preferences.",
        `Avoid list (do not repeat these English answers): ${avoidList.length > 0 ? avoidList.join(" | ") : "none"}`
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "everyday_expression",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["situationText", "englishText", "nativeAnswer", "distractors", "generatedContext"],
            properties: {
              situationText: { type: "string", minLength: 1 },
              englishText: { type: "string", minLength: 1 },
              nativeAnswer: { type: "string", minLength: 1 },
              distractors: { type: "array", items: { type: "string" }, minItems: 3, maxItems: 3 },
              generatedContext: { type: "string", minLength: 1 }
            }
          }
        }
      }
    });
    return JSON.parse(completion.output_text) as {
      englishText: string;
      situationText: string | null;
      nativeAnswer: string | null;
      distractors: string[];
      generatedContext: string | null;
    };
  } catch (error) {
    logger.error("OpenAI expression generation failed", error);
    if (env.AI_FALLBACK_ENABLED) {
      const fallbackExpressions = [
        {
          englishText: "Break a leg.",
          situationText: "Ein Freund hat morgen eine wichtige Prüfung. Was wünschst du ihm?",
          nativeAnswer: "Toi, toi, toi!",
          distractors: ["Brich dir ein Bein!", "Viel Glück beim Brechen!", "Mach das Bein kaputt!"],
          generatedContext: "idiom_encouragement"
        },
        {
          englishText: "It's not my cup of tea.",
          situationText: "Jemand fragt, ob du gern Jazz hörst, aber du magst es nicht. Was antwortest du?",
          nativeAnswer: "Das ist nicht so mein Ding.",
          distractors: ["Das ist nicht meine Tasse Tee.", "Ich mag keinen Tee.", "Das ist nicht mein Becher."],
          generatedContext: "idiom_opinion"
        },
        {
          englishText: "Let's call it a day.",
          situationText: "Es ist spät und ihr habt im Büro genug geschafft. Was schlägst du vor?",
          nativeAnswer: "Lass uns für heute Schluss machen.",
          distractors: ["Lass uns den Tag rufen.", "Nennen wir es einen Tag.", "Lass uns heute anfangen."],
          generatedContext: "idiom_work"
        }
      ];
      const fallback = pickRandom(fallbackExpressions);
      return {
        englishText: fallback.englishText,
        situationText: fallback.situationText,
        nativeAnswer: fallback.nativeAnswer,
        distractors: fallback.distractors,
        generatedContext: fallback.generatedContext
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

export interface ExpressionReviewAssessmentResult {
  naturalnessScore: number;
  feedback: string;
}

export const assessExpressionAttempt = async (input: {
  englishText: string;
  situationText?: string | null;
  referenceAnswer?: string | null;
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
      input: [
        input.situationText ? `Situation (German): ${input.situationText}` : null,
        `English hint: ${input.englishText}`,
        input.referenceAnswer ? `Reference native answer (one good option): ${input.referenceAnswer}` : null,
        `German attempt: ${input.userAnswerText}`
      ]
        .filter(Boolean)
        .join("\n"),
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
              feedback: { type: "string" },
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

export const assessExpressionReviewAttempt = async (input: {
  englishText: string;
  userAnswerText: string;
  baselineNativeLikeVersion: string;
}): Promise<ExpressionReviewAssessmentResult> => {
  if (!openai) {
    throw new AppError(503, "AI_CONFIGURATION_MISSING", API_MESSAGES.errors.aiConfigurationMissing, {
      provider: "openai",
      reason: "OPENAI_API_KEY is missing"
    });
  }

  try {
    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      instructions: EXPRESSION_REVIEW_ASSESSMENT_PROMPT,
      input: [
        `English expression: ${input.englishText}`,
        `German attempt: ${input.userAnswerText}`,
        `Reference native-like version: ${input.baselineNativeLikeVersion}`
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "expression_review_assessment",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["naturalnessScore", "feedback"],
            properties: {
              naturalnessScore: { type: "number", minimum: 0, maximum: 100 },
              feedback: { type: "string" }
            }
          }
        }
      }
    });
    return JSON.parse(completion.output_text) as ExpressionReviewAssessmentResult;
  } catch (error) {
    logger.error("OpenAI expression review assessment failed", error);
    if (env.AI_FALLBACK_ENABLED) {
      return {
        naturalnessScore: 0,
        feedback: "Fallback mode: review assessment unavailable. Please try again later."
      };
    }

    const status =
      error && typeof error === "object" && "status" in error && typeof (error as { status?: unknown }).status === "number"
        ? ((error as { status: number }).status >= 400 && (error as { status: number }).status <= 599
            ? (error as { status: number }).status
            : 502)
        : 502;
    throw new AppError(status, "AI_EXPRESSION_REVIEW_ASSESSMENT_FAILED", API_MESSAGES.errors.aiExpressionReviewAssessmentFailed, {
      provider: "openai",
      status: error && typeof error === "object" && "status" in error ? (error as { status?: unknown }).status : undefined,
      code: error && typeof error === "object" && "code" in error ? (error as { code?: unknown }).code : undefined,
      type: error && typeof error === "object" && "type" in error ? (error as { type?: unknown }).type : undefined
    });
  }
};

const COLLOCATION_GENERATION_PROMPT = `You generate exactly one common German collocation for an upper-intermediate learner (B1-C1).
A collocation is a conventional word partnership: Verantwortung übernehmen, eine Entscheidung treffen, die Ansicht teilen, hohes Fieber, Schule besuchen, sich Mühe geben.
Rules:
- Output strict JSON only.
- Pick HIGH-FREQUENCY collocations natives actually use in the target context; no rare or literary pairings.
- STRONGLY prefer collocations that are NOT word-for-word translatable from English (incongruent), because those cause typical learner errors
  (e.g. "eine Entscheidung treffen" not "machen", "Schule besuchen" not "gehen zu", "ein Foto machen" not "nehmen").
- germanText: the collocation in dictionary/base form (e.g. "Verantwortung übernehmen").
- englishText: the natural English equivalent (e.g. "to take on responsibility"), NOT a word-for-word gloss of the German.
- clozeSentence: one natural German sentence (B1-C1, 8-16 words) using the collocation INFLECTED, with a gap "____".
- Gap rule: the gap covers ONLY the hard-to-guess collocate (usually the verb or adjective, inflected as it appears);
  the partner noun stays VISIBLE in the sentence (e.g. "Sie haben die Entscheidung schnell ____." with clozeAnswer "getroffen").
  Only gap the full collocation when the words are adjacent and removing just the collocate would read unnaturally.
- clozeAnswer: EXACTLY the word(s) removed from clozeSentence and nothing more — replacing "____" with clozeAnswer must
  reproduce the complete, grammatical sentence. Never include visible sentence words in clozeAnswer.
- Exactly one gap ("____") per sentence.
- collocationType: one of ${COLLOCATION_TYPES.join(", ")}.
- Strict anti-repetition: never output a collocation identical or near-identical to entries in the avoid list (including inflection variants).
- No explanations, only JSON.`;

const COLLOCATION_ASSESSMENT_PROMPT = `You are a German collocation coach.
The learner saw a German sentence with the collocation gapped out ("____") plus the English equivalent, and typed their German answer for the gap.
Return strict JSON only:
{
  "score": number,
  "feedback": "string",
  "correctVersion": "string",
  "alternatives": ["string"]
}
Scoring rules (0-100):
- The learner only needs to supply the GAPPED words (the reference answer). Judge their answer against the gap, not the full collocation.
- If the learner typed more than the gap (e.g. the full collocation while part of it is already visible in the sentence), do NOT penalize the extra words — judge whether the collocate choice and its form are right.
- 95-100: conventional partner word(s), correct inflection for the gap. Also give 95-100 to an equally natural alternative collocate that fits the sentence.
- 60-90: right partner word but wrong inflection/case/word order; explain the form error briefly.
- 20-50: understandable but unconventional pairing (typical English transfer, e.g. "Entscheidung machen"); name the conventional partner word EXPLICITLY and contrast it with the learner's choice.
- 0-15: wrong meaning or unintelligible.
Feedback rules:
- Max 2 sentences, concrete, about the word PARTNERSHIP first, grammar second.
- If fully correct, feedback can be empty or a very short confirmation.
- correctVersion: exactly the text that fits the gap (the reference cloze answer).
- alternatives: other natural collocates that fit this gap (may be empty). Do not invent forced ones.
- No extra fields.`;

const COLLOCATION_REVIEW_ASSESSMENT_PROMPT = `You are a German collocation coach in review mode.
The learner is re-tested on a collocation they previously got wrong. Compare their answer against the reference answer for the gap.
Return strict JSON only:
{
  "score": number,
  "feedback": "string"
}
Rules:
- score 0-100; use the reference cloze answer as the PRIMARY gold standard.
- The learner only needs to supply the GAPPED words; if they typed the full collocation including words already visible in the sentence, do not penalize the extra words.
- 95-100 only for the conventional partner word(s) with correct inflection (or an equally natural alternative).
- Right partner word, wrong form: 60-90 with a one-sentence form note.
- Wrong partner word: below 50; name the conventional partner explicitly.
- Keep feedback max 2 sentences; empty if fully correct.
- No extra fields.`;

export interface CollocationGenerationResult {
  germanText: string;
  englishText: string;
  clozeSentence: string;
  clozeAnswer: string;
  collocationType: string;
}

export interface CollocationAssessmentResult {
  score: number;
  feedback: string;
  correctVersion: string;
  alternatives: string[];
}

export interface CollocationReviewAssessmentResult {
  score: number;
  feedback: string;
}

export const generateCollocation = async (
  category: CollocationGenerationCategory = "random",
  options?: { avoidGermanTexts?: string[] }
): Promise<CollocationGenerationResult> => {
  if (!openai) {
    throw new AppError(503, "AI_CONFIGURATION_MISSING", API_MESSAGES.errors.aiConfigurationMissing, {
      provider: "openai",
      reason: "OPENAI_API_KEY is missing"
    });
  }

  const config = COLLOCATION_CATEGORY_BY_ID[category];
  const contexts = config?.targetContexts?.length ? config.targetContexts : [...COLLOCATION_TARGET_CONTEXTS];
  const targetContext = pickRandom(contexts);
  const targetType = pickRandom(COLLOCATION_TYPES);
  const avoidList = (options?.avoidGermanTexts ?? [])
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .slice(0, 60);

  try {
    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      instructions: COLLOCATION_GENERATION_PROMPT,
      input: [
        "Generate one common German collocation.",
        `Selected category: ${category}`,
        `Target context: ${targetContext}`,
        `Preferred collocation type: ${targetType} (strong preference, not a hard constraint)`,
        `Avoid list (must not repeat): ${avoidList.length > 0 ? avoidList.join(" | ") : "none"}`
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "german_collocation",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["germanText", "englishText", "clozeSentence", "clozeAnswer", "collocationType"],
            properties: {
              germanText: { type: "string", minLength: 1 },
              englishText: { type: "string", minLength: 1 },
              clozeSentence: { type: "string", minLength: 1 },
              clozeAnswer: { type: "string", minLength: 1 },
              collocationType: { type: "string", enum: [...COLLOCATION_TYPES] }
            }
          }
        }
      }
    });
    return JSON.parse(completion.output_text) as CollocationGenerationResult;
  } catch (error) {
    logger.error("OpenAI collocation generation failed", error);
    if (env.AI_FALLBACK_ENABLED) {
      const fallbacks: CollocationGenerationResult[] = [
        {
          germanText: "eine Entscheidung treffen",
          englishText: "to make a decision",
          clozeSentence: "Wir müssen bis Freitag ____, sonst verlieren wir den Auftrag.",
          clozeAnswer: "eine Entscheidung treffen",
          collocationType: "verb_noun"
        },
        {
          germanText: "Verantwortung übernehmen",
          englishText: "to take on responsibility",
          clozeSentence: "In meiner neuen Rolle muss ich deutlich mehr ____.",
          clozeAnswer: "Verantwortung übernehmen",
          collocationType: "verb_noun"
        },
        {
          germanText: "die Schule besuchen",
          englishText: "to attend school",
          clozeSentence: "Seine Kinder ____ in Berlin ____.",
          clozeAnswer: "besuchen die Schule",
          collocationType: "verb_noun"
        }
      ];
      return pickRandom(fallbacks);
    }

    const status =
      error && typeof error === "object" && "status" in error && typeof (error as { status?: unknown }).status === "number"
        ? ((error as { status: number }).status >= 400 && (error as { status: number }).status <= 599
            ? (error as { status: number }).status
            : 502)
        : 502;
    throw new AppError(status, "AI_COLLOCATION_GENERATION_FAILED", API_MESSAGES.errors.aiCollocationGenerationFailed, {
      provider: "openai"
    });
  }
};

export const assessCollocationAttempt = async (input: {
  germanText: string;
  englishText: string;
  clozeSentence: string;
  clozeAnswer: string;
  userAnswerText: string;
}): Promise<CollocationAssessmentResult> => {
  if (!openai) {
    throw new AppError(503, "AI_CONFIGURATION_MISSING", API_MESSAGES.errors.aiConfigurationMissing, {
      provider: "openai",
      reason: "OPENAI_API_KEY is missing"
    });
  }

  try {
    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      instructions: COLLOCATION_ASSESSMENT_PROMPT,
      input: [
        `Cloze sentence: ${input.clozeSentence}`,
        `English equivalent: ${input.englishText}`,
        `Reference answer for the gap: ${input.clozeAnswer}`,
        `Target collocation (base form): ${input.germanText}`,
        `Learner answer: ${input.userAnswerText}`
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "collocation_assessment",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["score", "feedback", "correctVersion", "alternatives"],
            properties: {
              score: { type: "number", minimum: 0, maximum: 100 },
              feedback: { type: "string" },
              correctVersion: { type: "string", minLength: 1 },
              alternatives: { type: "array", items: { type: "string" } }
            }
          }
        }
      }
    });
    return JSON.parse(completion.output_text) as CollocationAssessmentResult;
  } catch (error) {
    logger.error("OpenAI collocation assessment failed", error);
    if (env.AI_FALLBACK_ENABLED) {
      return {
        score: 0,
        feedback: "Fallback mode: AI assessment unavailable. Please try again later.",
        correctVersion: input.clozeAnswer,
        alternatives: []
      };
    }

    const status =
      error && typeof error === "object" && "status" in error && typeof (error as { status?: unknown }).status === "number"
        ? ((error as { status: number }).status >= 400 && (error as { status: number }).status <= 599
            ? (error as { status: number }).status
            : 502)
        : 502;
    throw new AppError(status, "AI_COLLOCATION_ASSESSMENT_FAILED", API_MESSAGES.errors.aiCollocationAssessmentFailed, {
      provider: "openai"
    });
  }
};

export const assessCollocationReviewAttempt = async (input: {
  germanText: string;
  englishText: string;
  clozeSentence: string;
  baselineCorrectVersion: string;
  userAnswerText: string;
}): Promise<CollocationReviewAssessmentResult> => {
  if (!openai) {
    throw new AppError(503, "AI_CONFIGURATION_MISSING", API_MESSAGES.errors.aiConfigurationMissing, {
      provider: "openai",
      reason: "OPENAI_API_KEY is missing"
    });
  }

  try {
    const completion = await openai.responses.create({
      model: env.OPENAI_MODEL,
      instructions: COLLOCATION_REVIEW_ASSESSMENT_PROMPT,
      input: [
        `Cloze sentence: ${input.clozeSentence}`,
        `English equivalent: ${input.englishText}`,
        `Reference answer for the gap: ${input.baselineCorrectVersion}`,
        `Target collocation (base form): ${input.germanText}`,
        `Learner answer: ${input.userAnswerText}`
      ].join("\n"),
      text: {
        format: {
          type: "json_schema",
          name: "collocation_review_assessment",
          strict: true,
          schema: {
            type: "object",
            additionalProperties: false,
            required: ["score", "feedback"],
            properties: {
              score: { type: "number", minimum: 0, maximum: 100 },
              feedback: { type: "string" }
            }
          }
        }
      }
    });
    return JSON.parse(completion.output_text) as CollocationReviewAssessmentResult;
  } catch (error) {
    logger.error("OpenAI collocation review assessment failed", error);
    if (env.AI_FALLBACK_ENABLED) {
      return {
        score: 0,
        feedback: "Fallback mode: review assessment unavailable. Please try again later."
      };
    }

    const status =
      error && typeof error === "object" && "status" in error && typeof (error as { status?: unknown }).status === "number"
        ? ((error as { status: number }).status >= 400 && (error as { status: number }).status <= 599
            ? (error as { status: number }).status
            : 502)
        : 502;
    throw new AppError(status, "AI_COLLOCATION_REVIEW_ASSESSMENT_FAILED", API_MESSAGES.errors.aiCollocationReviewAssessmentFailed, {
      provider: "openai"
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
