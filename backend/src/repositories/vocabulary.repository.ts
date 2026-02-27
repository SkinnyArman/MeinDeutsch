import { appDataSource } from "../db/pool.js";
import { VocabularyItem, type VocabularyItemRecord } from "../models/vocabulary-item.model.js";

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

  async findById(input: { userId: number; vocabularyId: number }): Promise<VocabularyItemRecord | null> {
    const repo = appDataSource.getRepository(VocabularyItem);
    const row = await repo.findOne({
      where: {
        id: String(input.vocabularyId),
        userId: String(input.userId)
      }
    });
    return row ? toVocabularyRecord(row) : null;
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
  }): Promise<VocabularyItemRecord | null> {
    const repo = appDataSource.getRepository(VocabularyItem);
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
  }
};
