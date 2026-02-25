import { appDataSource } from "../db/pool.js";
import {
  ExpressionReviewItem,
  type ExpressionReviewItemRecord,
  type ExpressionReviewScorePoint
} from "../models/expression-review-item.model.js";

const toRecord = (entity: ExpressionReviewItem): ExpressionReviewItemRecord => ({
  id: Number(entity.id),
  englishText: entity.englishText,
  initialScore: entity.initialScore,
  lastScore: entity.lastScore,
  successCount: entity.successCount,
  reviewAttemptCount: entity.reviewAttemptCount,
  nextReviewAt: entity.nextReviewAt.toISOString(),
  lastReviewedAt: entity.lastReviewedAt ? entity.lastReviewedAt.toISOString() : null,
  status: entity.status,
  baselineNativeLikeVersion: entity.baselineNativeLikeVersion,
  baselineAlternatives: entity.baselineAlternatives,
  baselineFeedback: entity.baselineFeedback,
  scoreHistory: entity.scoreHistory,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString()
});

const normalizeExpression = (text: string): string => text.trim().toLowerCase();

export const expressionReviewRepository = {
  async upsertLowScoreItem(input: {
    userId: number;
    englishText: string;
    naturalnessScore: number;
    baselineNativeLikeVersion: string;
    baselineAlternatives: string[];
    baselineFeedback: string;
  }): Promise<ExpressionReviewItemRecord> {
    const repo = appDataSource.getRepository(ExpressionReviewItem);
    const normalizedEnglishText = normalizeExpression(input.englishText);
    const now = new Date();

    const existing = await repo.findOne({
      where: {
        userId: String(input.userId),
        normalizedEnglishText,
        status: "active"
      }
    });

    if (existing) {
      const nextHistory: ExpressionReviewScorePoint[] = Array.isArray(existing.scoreHistory) ? existing.scoreHistory : [];
      nextHistory.push({ score: input.naturalnessScore, at: now.toISOString() });

      existing.lastScore = input.naturalnessScore;
      existing.nextReviewAt = now;
      existing.scoreHistory = nextHistory;
      existing.baselineNativeLikeVersion = input.baselineNativeLikeVersion;
      existing.baselineAlternatives = input.baselineAlternatives;
      existing.baselineFeedback = input.baselineFeedback;

      const saved = await repo.save(existing);
      return toRecord(saved);
    }

    const created = repo.create({
      userId: String(input.userId),
      englishText: input.englishText.trim(),
      normalizedEnglishText,
      initialScore: input.naturalnessScore,
      lastScore: input.naturalnessScore,
      successCount: 0,
      reviewAttemptCount: 0,
      nextReviewAt: now,
      lastReviewedAt: null,
      status: "active",
      baselineNativeLikeVersion: input.baselineNativeLikeVersion,
      baselineAlternatives: input.baselineAlternatives,
      baselineFeedback: input.baselineFeedback,
      scoreHistory: [{ score: input.naturalnessScore, at: now.toISOString() }]
    });

    const saved = await repo.save(created);
    return toRecord(saved);
  },

  async listDueItems(input: { userId: number; limit: number }): Promise<ExpressionReviewItemRecord[]> {
    const repo = appDataSource.getRepository(ExpressionReviewItem);
    const rows = await repo
      .createQueryBuilder("item")
      .where("item.user_id = :userId", { userId: String(input.userId) })
      .andWhere("item.status = 'active'")
      .andWhere("item.next_review_at <= :now", { now: new Date().toISOString() })
      .orderBy("item.next_review_at", "ASC")
      .addOrderBy("item.last_score", "ASC")
      .take(input.limit)
      .getMany();

    return rows.map(toRecord);
  },

  async countDueItems(userId: number): Promise<number> {
    const repo = appDataSource.getRepository(ExpressionReviewItem);
    return repo
      .createQueryBuilder("item")
      .where("item.user_id = :userId", { userId: String(userId) })
      .andWhere("item.status = 'active'")
      .andWhere("item.next_review_at <= :now", { now: new Date().toISOString() })
      .getCount();
  },

  async findById(input: { userId: number; reviewItemId: number }): Promise<ExpressionReviewItemRecord | null> {
    const repo = appDataSource.getRepository(ExpressionReviewItem);
    const row = await repo.findOne({
      where: {
        id: String(input.reviewItemId),
        userId: String(input.userId)
      }
    });
    return row ? toRecord(row) : null;
  },

  async saveReviewProgress(input: {
    userId: number;
    reviewItemId: number;
    naturalnessScore: number;
    successCount: number;
    reviewAttemptCount: number;
    nextReviewAt: Date | null;
    status: "active" | "graduated";
  }): Promise<ExpressionReviewItemRecord | null> {
    const repo = appDataSource.getRepository(ExpressionReviewItem);
    const row = await repo.findOne({
      where: {
        id: String(input.reviewItemId),
        userId: String(input.userId)
      }
    });

    if (!row) {
      return null;
    }

    const history: ExpressionReviewScorePoint[] = Array.isArray(row.scoreHistory) ? row.scoreHistory : [];
    const now = new Date();
    history.push({ score: input.naturalnessScore, at: now.toISOString() });

    row.lastScore = input.naturalnessScore;
    row.successCount = input.successCount;
    row.reviewAttemptCount = input.reviewAttemptCount;
    row.lastReviewedAt = now;
    row.nextReviewAt = input.nextReviewAt ?? now;
    row.status = input.status;
    row.scoreHistory = history;

    const saved = await repo.save(row);
    return toRecord(saved);
  }
};
