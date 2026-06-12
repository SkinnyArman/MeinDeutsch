import { appDataSource } from "../db/pool.js";
import {
  CollocationReviewItem,
  type CollocationReviewItemRecord,
  type CollocationReviewScorePoint
} from "../models/collocation-review-item.model.js";
import { normalizeCollocationText } from "./collocation.repository.js";

const toRecord = (entity: CollocationReviewItem): CollocationReviewItemRecord => ({
  id: Number(entity.id),
  germanText: entity.germanText,
  englishText: entity.englishText,
  clozeSentence: entity.clozeSentence,
  initialScore: entity.initialScore,
  lastScore: entity.lastScore,
  successCount: entity.successCount,
  reviewAttemptCount: entity.reviewAttemptCount,
  nextReviewAt: entity.nextReviewAt.toISOString(),
  lastReviewedAt: entity.lastReviewedAt ? entity.lastReviewedAt.toISOString() : null,
  status: entity.status,
  baselineCorrectVersion: entity.baselineCorrectVersion,
  baselineAlternatives: entity.baselineAlternatives,
  baselineFeedback: entity.baselineFeedback,
  scoreHistory: entity.scoreHistory,
  createdAt: entity.createdAt.toISOString(),
  updatedAt: entity.updatedAt.toISOString()
});

export const collocationReviewRepository = {
  async upsertLowScoreItem(input: {
    userId: number;
    germanText: string;
    englishText: string;
    clozeSentence: string;
    score: number;
    baselineCorrectVersion: string;
    baselineAlternatives: string[];
    baselineFeedback: string;
  }): Promise<CollocationReviewItemRecord> {
    const repo = appDataSource.getRepository(CollocationReviewItem);
    const normalizedGermanText = normalizeCollocationText(input.germanText);
    const now = new Date();

    const existing = await repo.findOne({
      where: {
        userId: String(input.userId),
        normalizedGermanText
      }
    });

    if (existing) {
      const nextHistory: CollocationReviewScorePoint[] = Array.isArray(existing.scoreHistory)
        ? existing.scoreHistory
        : [];
      nextHistory.push({ score: input.score, at: now.toISOString() });

      existing.lastScore = input.score;
      existing.nextReviewAt = now;
      existing.scoreHistory = nextHistory;
      existing.englishText = input.englishText;
      existing.clozeSentence = input.clozeSentence;
      existing.baselineCorrectVersion = input.baselineCorrectVersion;
      existing.baselineAlternatives = input.baselineAlternatives;
      existing.baselineFeedback = input.baselineFeedback;
      // A fresh failure reactivates a graduated item.
      existing.status = "active";
      existing.successCount = 0;

      const saved = await repo.save(existing);
      return toRecord(saved);
    }

    const created = repo.create({
      userId: String(input.userId),
      germanText: input.germanText.trim(),
      normalizedGermanText,
      englishText: input.englishText.trim(),
      clozeSentence: input.clozeSentence.trim(),
      initialScore: input.score,
      lastScore: input.score,
      successCount: 0,
      reviewAttemptCount: 0,
      nextReviewAt: now,
      lastReviewedAt: null,
      status: "active",
      baselineCorrectVersion: input.baselineCorrectVersion,
      baselineAlternatives: input.baselineAlternatives,
      baselineFeedback: input.baselineFeedback,
      scoreHistory: [{ score: input.score, at: now.toISOString() }]
    });

    const saved = await repo.save(created);
    return toRecord(saved);
  },

  async listDueItems(input: { userId: number; limit: number }): Promise<CollocationReviewItemRecord[]> {
    const repo = appDataSource.getRepository(CollocationReviewItem);
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
    const repo = appDataSource.getRepository(CollocationReviewItem);
    return repo
      .createQueryBuilder("item")
      .where("item.user_id = :userId", { userId: String(userId) })
      .andWhere("item.status = 'active'")
      .andWhere("item.next_review_at <= :now", { now: new Date().toISOString() })
      .getCount();
  },

  async findById(input: { userId: number; reviewItemId: number }): Promise<CollocationReviewItemRecord | null> {
    const repo = appDataSource.getRepository(CollocationReviewItem);
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
    score: number;
    successCount: number;
    reviewAttemptCount: number;
    nextReviewAt: Date | null;
    status: "active" | "graduated";
  }): Promise<CollocationReviewItemRecord | null> {
    const repo = appDataSource.getRepository(CollocationReviewItem);
    const row = await repo.findOne({
      where: {
        id: String(input.reviewItemId),
        userId: String(input.userId)
      }
    });

    if (!row) {
      return null;
    }

    const history: CollocationReviewScorePoint[] = Array.isArray(row.scoreHistory) ? row.scoreHistory : [];
    const now = new Date();
    history.push({ score: input.score, at: now.toISOString() });

    row.lastScore = input.score;
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
