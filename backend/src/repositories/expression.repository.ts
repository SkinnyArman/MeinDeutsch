import { appDataSource } from "../db/pool.js";
import { ExpressionAttempt, type ExpressionAttemptRecord } from "../models/expression-attempt.model.js";
import { ExpressionPrompt, type ExpressionPromptRecord } from "../models/expression-prompt.model.js";

const toPromptRecord = (entity: ExpressionPrompt): ExpressionPromptRecord => ({
  id: Number(entity.id),
  englishText: entity.englishText,
  generatedContext: entity.generatedContext,
  createdAt: entity.createdAt.toISOString()
});

const toAttemptRecord = (entity: ExpressionAttempt): ExpressionAttemptRecord => ({
  id: Number(entity.id),
  promptId: Number(entity.promptId),
  englishText: entity.englishText,
  userAnswerText: entity.userAnswerText,
  naturalnessScore: entity.naturalnessScore,
  feedback: entity.feedback,
  nativeLikeVersion: entity.nativeLikeVersion,
  alternatives: entity.alternatives,
  createdAt: entity.createdAt.toISOString()
});

export const expressionRepository = {
  async createPrompt(input: { userId: number; englishText: string; generatedContext?: string | null }): Promise<ExpressionPromptRecord> {
    const repo = appDataSource.getRepository(ExpressionPrompt);
    const created = repo.create({
      userId: String(input.userId),
      englishText: input.englishText,
      generatedContext: input.generatedContext ?? null
    });
    const saved = await repo.save(created);
    return toPromptRecord(saved);
  },

  async findPromptById(input: { userId: number; promptId: number }): Promise<ExpressionPromptRecord | null> {
    const repo = appDataSource.getRepository(ExpressionPrompt);
    const row = await repo.findOne({
      where: {
        id: String(input.promptId),
        userId: String(input.userId)
      }
    });
    return row ? toPromptRecord(row) : null;
  },

  async createAttempt(input: {
    userId: number;
    promptId: number;
    englishText: string;
    userAnswerText: string;
    naturalnessScore: number;
    feedback: string;
    nativeLikeVersion: string;
    alternatives: string[];
  }): Promise<ExpressionAttemptRecord> {
    const repo = appDataSource.getRepository(ExpressionAttempt);
    const created = repo.create({
      userId: String(input.userId),
      promptId: String(input.promptId),
      englishText: input.englishText,
      userAnswerText: input.userAnswerText,
      naturalnessScore: input.naturalnessScore,
      feedback: input.feedback,
      nativeLikeVersion: input.nativeLikeVersion,
      alternatives: input.alternatives
    });
    const saved = await repo.save(created);
    return toAttemptRecord(saved);
  },

  async listAttempts(input: { userId: number; limit: number; offset: number }): Promise<ExpressionAttemptRecord[]> {
    const repo = appDataSource.getRepository(ExpressionAttempt);
    const rows = await repo.find({
      where: { userId: String(input.userId) },
      order: { createdAt: "DESC" },
      take: input.limit,
      skip: input.offset
    });
    return rows.map(toAttemptRecord);
  },

  async countAttempts(input: { userId: number }): Promise<number> {
    const repo = appDataSource.getRepository(ExpressionAttempt);
    return repo.count({
      where: { userId: String(input.userId) }
    });
  }
};
