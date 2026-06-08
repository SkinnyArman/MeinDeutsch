import { appDataSource } from "../db/pool.js";
import { vocabularyRepository } from "../repositories/vocabulary.repository.js";
import type { VocabularyItemRecord } from "../models/vocabulary-item.model.js";
import type {
  VocabularyReviewQueuePayload,
  VocabularyReviewRating
} from "../contracts/api-types.js";
import { AppError } from "../utils/app-error.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import { categoryToIcon } from "../constants/vocabulary-icons.js";
import { computeNextSrsState } from "../logic/srs.logic.js";

interface SaveVocabularyInput {
  userId: number;
  word: string;
  description: string;
  examples: string[];
  category?: string;
  sourceAnswerLogId?: number;
  sourceQuestionId?: number;
}

const normalizeCategory = (word: string, category?: string): string => {
  const raw = (category ?? "").trim();
  if (/\(perfekt:/i.test(word)) {
    return "General";
  }
  if (!raw) {
    return "General";
  }
  return raw;
};

export const vocabularyService = {
  async saveWord(input: SaveVocabularyInput): Promise<{ entry: VocabularyItemRecord; created: boolean }> {
    const category = normalizeCategory(input.word, input.category);
    return vocabularyRepository.createOrGet({
      userId: input.userId,
      word: input.word,
      description: input.description,
      examples: input.examples,
      category,
      sourceAnswerLogId: input.sourceAnswerLogId,
      sourceQuestionId: input.sourceQuestionId
    });
  },

  async listWords(input: { userId: number; category?: string; sourceAnswerLogId?: number; limit?: number; offset?: number }): Promise<VocabularyItemRecord[]> {
    return vocabularyRepository.list({
      userId: input.userId,
      category: input.category?.trim() || null,
      sourceAnswerLogId: input.sourceAnswerLogId,
      limit: input.limit,
      offset: input.offset
    });
  },

  async listCategories(userId: number): Promise<string[]> {
    return vocabularyRepository.listCategories(userId);
  },

  async listCategoryMeta(userId: number): Promise<Array<{ name: string; icon: string }>> {
    const categories = await vocabularyRepository.listCategories(userId);
    return categories.map((name) => ({ name, icon: categoryToIcon(name) }));
  },

  async listDueReviewQueue(input: {
    userId: number;
    limit?: number;
    now?: Date;
  }): Promise<VocabularyReviewQueuePayload> {
    const now = input.now ?? new Date();
    const limit = input.limit ?? 20;
    const [items, dueCount, nextDueAt] = await Promise.all([
      vocabularyRepository.listDue({ userId: input.userId, limit, now }),
      vocabularyRepository.countDue({ userId: input.userId, now }),
      vocabularyRepository.findNextDueAt({ userId: input.userId, now })
    ]);
    return {
      items,
      dueCount,
      nextDueAt,
      generatedAt: now.toISOString()
    };
  },

  async reviewWord(input: {
    userId: number;
    vocabularyId: number;
    rating: VocabularyReviewRating;
    now?: Date;
  }): Promise<VocabularyItemRecord> {
    return appDataSource.transaction(async (manager) => {
      const existing = await vocabularyRepository.findByIdForUpdate({
        userId: input.userId,
        vocabularyId: input.vocabularyId
      }, manager);

      if (!existing) {
        throw new AppError(404, "VOCABULARY_NOT_FOUND", API_MESSAGES.errors.vocabularyNotFound);
      }

      const now = input.now ?? new Date();
      if (existing.srsDueAt) {
        const dueAtMs = new Date(existing.srsDueAt).getTime();
        if (Number.isFinite(dueAtMs) && dueAtMs > now.getTime()) {
          throw new AppError(409, "VOCABULARY_NOT_DUE", API_MESSAGES.errors.vocabularyNotDue, {
            dueAt: existing.srsDueAt
          });
        }
      }

      const nextSrsState = computeNextSrsState(existing, input.rating);
      const nextDueAt = new Date(now.getTime() + nextSrsState.nextDelayMinutes * 60 * 1000);
      const updated = await vocabularyRepository.saveSrsState({
        userId: input.userId,
        vocabularyId: input.vocabularyId,
        nextIntervalDays: nextSrsState.nextIntervalDays,
        nextEaseFactor: nextSrsState.nextEaseFactor,
        nextDueAt,
        rating: input.rating,
        incrementLapse: nextSrsState.incrementLapse,
        reviewedAt: now
      }, manager);

      if (!updated) {
        throw new AppError(404, "VOCABULARY_NOT_FOUND", API_MESSAGES.errors.vocabularyNotFound);
      }

      await vocabularyRepository.createReviewLog({
        userId: input.userId,
        vocabularyItemId: input.vocabularyId,
        rating: input.rating,
        previousDueAt: existing.srsDueAt,
        nextDueAt,
        previousIntervalDays: existing.srsIntervalDays,
        nextIntervalDays: nextSrsState.nextIntervalDays,
        previousEaseFactor: existing.srsEaseFactor,
        nextEaseFactor: nextSrsState.nextEaseFactor,
        reviewedAt: now
      }, manager);

      return updated;
    });
  }
};
