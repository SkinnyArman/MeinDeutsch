import { API_MESSAGES } from "../constants/api-messages.js";
import type { AnswerLogRecord } from "../models/answer-log.model.js";
import type { SubmissionInput } from "../types/submission.types.js";
import { analyzeSubmission } from "../ai/analysis.client.js";
import { knowledgeRepository } from "../repositories/knowledge.repository.js";
import { questionRepository } from "../repositories/question.repository.js";
import { submissionRepository } from "../repositories/submission.repository.js";
import { streakService } from "./streak.service.js";
import { AppError } from "../utils/app-error.js";

export const submissionService = {
  async processTextSubmission(input: SubmissionInput): Promise<AnswerLogRecord> {
    let questionText = input.prompt?.trim();
    const questionId = input.questionId;
    let topicId: number | undefined;
    let topicName: string | undefined;

    if (questionId) {
      const question = await questionRepository.findById(questionId);
      if (!question) {
        throw new AppError(404, "QUESTION_NOT_FOUND", API_MESSAGES.errors.questionNotFound);
      }
      questionText = question.questionText;
      topicId = question.topicId;
      topicName = question.topicName;
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

    await knowledgeRepository.createFromSubmission({
      topicId,
      topicName,
      questionId,
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
