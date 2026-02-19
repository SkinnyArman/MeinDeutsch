import { API_MESSAGES } from "../constants/api-messages.js";
import type { AnswerLogRecord } from "../models/answer-log.model.js";
import type { SubmissionInput } from "../types/submission.types.js";
import { analyzeSubmission } from "../ai/analysis.client.js";
import { questionRepository } from "../repositories/question.repository.js";
import { submissionRepository } from "../repositories/submission.repository.js";
import { AppError } from "../utils/app-error.js";

export const submissionService = {
  async processTextSubmission(input: SubmissionInput): Promise<AnswerLogRecord> {
    let questionText = input.prompt?.trim();
    const questionId = input.questionId;

    if (questionId) {
      const question = await questionRepository.findById(questionId);
      if (!question) {
        throw new AppError(404, "QUESTION_NOT_FOUND", API_MESSAGES.errors.questionNotFound);
      }
      questionText = question.questionText;
    }

    if (!questionText) {
      throw new AppError(400, "QUESTION_TEXT_REQUIRED", API_MESSAGES.errors.questionTextRequired);
    }

    const context = await submissionRepository.getAssessmentContext();
    const analysis = await analyzeSubmission(
      {
        questionText,
        answerText: input.answerText
      },
      context
    );

    const answerLog = await submissionRepository.insertAnswerLog(
      {
        questionId,
        questionText,
        answerText: input.answerText
      },
      analysis
    );
    await submissionRepository.upsertMistakeStats(analysis);
    return answerLog;
  }
};
