import type { EntityManager } from "typeorm";
import type { VocabularyReviewRating } from "../contracts/api-types.js";
import { appDataSource } from "../db/pool.js";
import { VocabularyItem, type VocabularyItemRecord } from "../models/vocabulary-item.model.js";
import { VocabularyReviewLog } from "../models/vocabulary-review-log.model.js";

interface CreateVocabularyInput {
  userId: number;
  word: string;
  description: string;
  examples: string[];
  category: string;
  sourceAnswerLogId?: number;
  sourceQuestionId?: number;
}

const toVocabularyRecord = (entity: VocabularyItem): VocabularyItemRecord => ({
  id: Number(entity.id),
  word: entity.word,
  description: entity.description,
  examples: entity.examples,
  category: entity.category,
  sourceAnswerLogId: entity.sourceAnswerLogId ? Number(entity.sourceAnswerLogId) : null,
  sourceQuestionId: entity.sourceQuestionId ? Number(entity.sourceQuestionId) : null,
  srsIntervalDays: entity.srsIntervalDays,
  srsEaseFactor: entity.srsEaseFactor,
  srsDueAt: entity.srsDueAt ? entity.srsDueAt.toISOString() : null,
  srsLastRating: entity.srsLastRating,
  srsReviewCount: entity.srsReviewCount,
  srsLapseCount: entity.srsLapseCount,
  srsLastReviewedAt: entity.srsLastReviewedAt ? entity.srsLastReviewedAt.toISOString() : null,
  createdAt: entity.createdAt.toISOString()
});

export const vocabularyRepository = {
  async createOrGet(input: CreateVocabularyInput): Promise<{ entry: VocabularyItemRecord; created: boolean }> {
    const repo = appDataSource.getRepository(VocabularyItem);
    const normalizedWord = input.word.trim().toLowerCase();

    const existing = await repo.findOne({
      where: { userId: String(input.userId), normalizedWord, category: input.category }
    });

    if (existing) {
      return { entry: toVocabularyRecord(existing), created: false };
    }

    const created = repo.create({
      userId: String(input.userId),
      word: input.word.trim(),
      normalizedWord,
      description: input.description.trim(),
      examples: input.examples.map((item) => item.trim()),
      category: input.category,
      sourceAnswerLogId: input.sourceAnswerLogId ? String(input.sourceAnswerLogId) : null,
      sourceQuestionId: input.sourceQuestionId ? String(input.sourceQuestionId) : null
    });

    const saved = await repo.save(created);
    return { entry: toVocabularyRecord(saved), created: true };
  },

  async list(input: { userId: number; category?: string | null; sourceAnswerLogId?: number | null; limit?: number; offset?: number }): Promise<VocabularyItemRecord[]> {
    const repo = appDataSource.getRepository(VocabularyItem);
    const qb = repo
      .createQueryBuilder("vocab")
      .where("vocab.user_id = :userId", { userId: String(input.userId) })
      .orderBy("vocab.created_at", "DESC");

    if (input.category) {
      qb.andWhere("vocab.category = :category", { category: input.category });
    }
    if (input.sourceAnswerLogId) {
      qb.andWhere("vocab.source_answer_log_id = :sourceAnswerLogId", {
        sourceAnswerLogId: String(input.sourceAnswerLogId)
      });
    }

    if (typeof input.limit === "number") {
      qb.limit(input.limit);
    }
    if (typeof input.offset === "number") {
      qb.offset(input.offset);
    }

    const rows = await qb.getMany();
    return rows.map(toVocabularyRecord);
  },

  async count(input: { userId: number; category?: string | null; sourceAnswerLogId?: number | null }): Promise<number> {
    const repo = appDataSource.getRepository(VocabularyItem);
    const qb = repo
      .createQueryBuilder("vocab")
      .where("vocab.user_id = :userId", { userId: String(input.userId) });

    if (input.category) {
      qb.andWhere("vocab.category = :category", { category: input.category });
    }
    if (input.sourceAnswerLogId) {
      qb.andWhere("vocab.source_answer_log_id = :sourceAnswerLogId", {
        sourceAnswerLogId: String(input.sourceAnswerLogId)
      });
    }

    return qb.getCount();
  },

  async listCategories(userId: number): Promise<string[]> {
    const repo = appDataSource.getRepository(VocabularyItem);
    const rows = await repo
      .createQueryBuilder("vocab")
      .where("vocab.user_id = :userId", { userId: String(userId) })
      .select("DISTINCT vocab.category", "category")
      .orderBy("vocab.category", "ASC")
      .getRawMany<{ category: string }>();

    return rows.map((row) => row.category);
  },

  async findById(
    input: { userId: number; vocabularyId: number },
    manager?: EntityManager
  ): Promise<VocabularyItemRecord | null> {
    const repo = (manager ?? appDataSource.manager).getRepository(VocabularyItem);
    const row = await repo.findOne({
      where: {
        id: String(input.vocabularyId),
        userId: String(input.userId)
      }
    });
    return row ? toVocabularyRecord(row) : null;
  },

  async findByIdForUpdate(
    input: { userId: number; vocabularyId: number },
    manager: EntityManager
  ): Promise<VocabularyItemRecord | null> {
    const row = await manager
      .getRepository(VocabularyItem)
      .createQueryBuilder("vocab")
      .setLock("pessimistic_write")
      .where("vocab.id = :id", { id: String(input.vocabularyId) })
      .andWhere("vocab.user_id = :userId", { userId: String(input.userId) })
      .getOne();
    return row ? toVocabularyRecord(row) : null;
  },

  async listDue(input: {
    userId: number;
    limit: number;
    now: Date;
  }): Promise<VocabularyItemRecord[]> {
    const rows = await appDataSource
      .getRepository(VocabularyItem)
      .createQueryBuilder("vocab")
      .where("vocab.user_id = :userId", { userId: String(input.userId) })
      .andWhere("(vocab.srs_due_at IS NULL OR vocab.srs_due_at <= :now)", {
        now: input.now.toISOString()
      })
      .orderBy("COALESCE(vocab.srs_due_at, vocab.created_at)", "ASC")
      .addOrderBy("vocab.srs_lapse_count", "DESC")
      .addOrderBy("vocab.id", "ASC")
      .take(input.limit)
      .getMany();
    return rows.map(toVocabularyRecord);
  },

  async countDue(input: { userId: number; now: Date }): Promise<number> {
    return appDataSource
      .getRepository(VocabularyItem)
      .createQueryBuilder("vocab")
      .where("vocab.user_id = :userId", { userId: String(input.userId) })
      .andWhere("(vocab.srs_due_at IS NULL OR vocab.srs_due_at <= :now)", {
        now: input.now.toISOString()
      })
      .getCount();
  },

  async findNextDueAt(input: { userId: number; now: Date }): Promise<string | null> {
    const row = await appDataSource
      .getRepository(VocabularyItem)
      .createQueryBuilder("vocab")
      .select("MIN(vocab.srs_due_at)", "nextDueAt")
      .where("vocab.user_id = :userId", { userId: String(input.userId) })
      .andWhere("vocab.srs_due_at > :now", { now: input.now.toISOString() })
      .getRawOne<{ nextDueAt: Date | string | null }>();
    if (!row?.nextDueAt) {
      return null;
    }
    return new Date(row.nextDueAt).toISOString();
  },

  async saveSrsState(input: {
    userId: number;
    vocabularyId: number;
    nextIntervalDays: number;
    nextEaseFactor: number;
    nextDueAt: Date;
    rating: number;
    incrementLapse: boolean;
    reviewedAt: Date;
  }, manager?: EntityManager): Promise<VocabularyItemRecord | null> {
    const repo = (manager ?? appDataSource.manager).getRepository(VocabularyItem);
    const row = await repo.findOne({
      where: {
        id: String(input.vocabularyId),
        userId: String(input.userId)
      }
    });

    if (!row) {
      return null;
    }

    row.srsIntervalDays = input.nextIntervalDays;
    row.srsEaseFactor = input.nextEaseFactor;
    row.srsDueAt = input.nextDueAt;
    row.srsLastRating = input.rating;
    row.srsReviewCount += 1;
    row.srsLastReviewedAt = input.reviewedAt;
    if (input.incrementLapse) {
      row.srsLapseCount += 1;
    }

    const saved = await repo.save(row);
    return toVocabularyRecord(saved);
  },

  async createReviewLog(input: {
    userId: number;
    vocabularyItemId: number;
    rating: VocabularyReviewRating;
    previousDueAt: string | null;
    nextDueAt: Date;
    previousIntervalDays: number;
    nextIntervalDays: number;
    previousEaseFactor: number;
    nextEaseFactor: number;
    reviewedAt: Date;
  }, manager: EntityManager): Promise<void> {
    const repo = manager.getRepository(VocabularyReviewLog);
    await repo.save(repo.create({
      userId: String(input.userId),
      vocabularyItemId: String(input.vocabularyItemId),
      rating: input.rating,
      previousDueAt: input.previousDueAt ? new Date(input.previousDueAt) : null,
      nextDueAt: input.nextDueAt,
      previousIntervalDays: input.previousIntervalDays,
      nextIntervalDays: input.nextIntervalDays,
      previousEaseFactor: input.previousEaseFactor,
      nextEaseFactor: input.nextEaseFactor,
      reviewedAt: input.reviewedAt
    }));
  }
};
