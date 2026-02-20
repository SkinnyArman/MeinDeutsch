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

    const answerLog = await submissionRepository.insertAnswerLog(
      {
        questionId: input.questionId,
        questionText,
        answerText: input.answerText
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
