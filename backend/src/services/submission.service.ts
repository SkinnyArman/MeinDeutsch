import type { AnswerLogRecord } from "../models/answer-log.model.js";
import type { SubmissionInput } from "../types/submission.types.js";
import { analyzeSubmission } from "../ai/analysis.client.js";
import { submissionRepository } from "../repositories/submission.repository.js";

export const submissionService = {
  async processTextSubmission(input: SubmissionInput): Promise<AnswerLogRecord> {
    const analysis = await analyzeSubmission(input);
    const answerLog = await submissionRepository.insertAnswerLog(input, analysis);
    await submissionRepository.upsertMistakeStats(analysis);
    return answerLog;
  }
};
