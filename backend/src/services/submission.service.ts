import { API_MESSAGES } from "../constants/api-messages.js";
import type { AnswerLogRecord } from "../models/answer-log.model.js";
import type { AnalysisError, SubmissionInput } from "../types/submission.types.js";
import { analyzeSubmission } from "../ai/analysis.client.js";
import { env } from "../config/env.js";
import { knowledgeRepository } from "../repositories/knowledge.repository.js";
import { questionRepository } from "../repositories/question.repository.js";
import { submissionRepository } from "../repositories/submission.repository.js";
import { streakService } from "./streak.service.js";
import { AppError } from "../utils/app-error.js";

export const submissionService = {
  async processTextSubmission(input: SubmissionInput): Promise<AnswerLogRecord> {
    const question = await questionRepository.findById(input.questionId);
    if (!question) {
      throw new AppError(404, "QUESTION_NOT_FOUND", API_MESSAGES.errors.questionNotFound);
    }
    const questionText = question.questionText;
    const topicId = question.topicId;
    const topicName = question.topicName;

    const context = await submissionRepository.getAssessmentContext();
    const analysis = await analyzeSubmission(
      {
        questionText,
        answerText: input.answerText
      },
      context
    );
    const modelUsed = detectModelUsed(analysis.tips);
    analysis.correctedText = sanitizeCorrectedText(input.answerText, analysis.correctedText);
    analysis.errors = alignErrorRanges(input.answerText, analysis.correctedText, analysis.errors);
    analysis.errors = filterInvalidErrors(input.answerText, analysis.correctedText, analysis.errors);

    const answerLog = await submissionRepository.insertAnswerLog(
      {
        questionId: input.questionId,
        questionText,
        answerText: input.answerText,
        modelUsed
      },
      analysis
    );

    await knowledgeRepository.createFromSubmission({
      topicId,
      topicName,
      questionId: input.questionId,
      questionText,
      answerLogId: answerLog.id,
      answerText: input.answerText,
      analysis
    });

    await submissionRepository.upsertMistakeStats(analysis);
    await streakService.recordDailyTalkCompletion();
    return answerLog;
  }
};

const detectModelUsed = (tips: string[]): string => {
  if (tips.some((tip) => tip.toLowerCase().includes("fallback mode"))) {
    return "fallback";
  }
  return env.OPENAI_MODEL;
};

const sanitizeCorrectedText = (original: string, corrected: string): string => {
  const trimmed = corrected.trim();
  if (!trimmed) {
    return corrected;
  }

  let sanitized = trimmed;

  // Remove parenthetical additions not present in original text.
  sanitized = sanitized.replace(/\(([^)]*)\)/g, (match) => (original.includes(match) ? match : ""));

  // Remove trailing single-letter token not present in the original text.
  const trailingSingle = sanitized.match(/\s([A-Za-z])$/);
  if (trailingSingle && !original.includes(trailingSingle[0].trim())) {
    sanitized = sanitized.replace(/\s[A-Za-z]$/, "");
  }

  return sanitized.trim();
};

const alignErrorRanges = (answerText: string, correctedText: string, errors: AnalysisError[]): AnalysisError[] => {
  const normalizedText = answerText;

  return errors.map((error) => {
    const candidates = collectEvidenceCandidates(error).sort((a, b) => b.length - a.length);
    for (const candidate of candidates) {
      const start = normalizedText.indexOf(candidate);
      if (start !== -1) {
        return { ...error, start, end: start + candidate.length, evidence: candidate };
      }
    }

    if (typeof error.start === "number" && typeof error.end === "number") {
      const slice = normalizedText.slice(error.start, error.end);
      if (slice) {
        return { ...error, evidence: slice };
      }
    }

    return { ...error, start: null, end: null };
  });
};

const filterInvalidErrors = (
  answerText: string,
  correctedText: string,
  errors: AnalysisError[]
): AnalysisError[] => {
  return errors.filter((error) => {
    if (!error.evidence || !error.correction) {
      return false;
    }
    if (error.evidence.trim() === error.correction.trim()) {
      return false;
    }
    if (typeof error.start !== "number" || typeof error.end !== "number") {
      return false;
    }
    if (!answerText.includes(error.evidence)) {
      return false;
    }
    if (!correctedText.includes(error.correction)) {
      return false;
    }
    return true;
  });
};

const collectEvidenceCandidates = (error: AnalysisError): string[] => {
  const candidates: string[] = [];

  const rawEvidence = error.evidence?.trim() ?? "";
  const cleanedEvidence = rawEvidence.replace(/^["'“”‘’]+|["'“”‘’]+$/g, "");
  if (cleanedEvidence) {
    candidates.push(cleanedEvidence);
  }

  return Array.from(new Set(candidates));
};
