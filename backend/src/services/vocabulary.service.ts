import { vocabularyRepository } from "../repositories/vocabulary.repository.js";
import type { VocabularyItemRecord } from "../models/vocabulary-item.model.js";
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

  async reviewWord(input: { userId: number; vocabularyId: number; rating: number }): Promise<VocabularyItemRecord> {
    const existing = await vocabularyRepository.findById({
      userId: input.userId,
      vocabularyId: input.vocabularyId
    });

    if (!existing) {
      throw new AppError(404, "VOCABULARY_NOT_FOUND", API_MESSAGES.errors.vocabularyNotFound);
    }

    // Backend guard: reviews are only allowed when due now (or no due date yet).
    if (existing.srsDueAt) {
      const dueAtMs = new Date(existing.srsDueAt).getTime();
      if (Number.isFinite(dueAtMs) && dueAtMs > Date.now()) {
        throw new AppError(409, "VOCABULARY_NOT_DUE", API_MESSAGES.errors.vocabularyNotDue, {
          dueAt: existing.srsDueAt
        });
      }
    }

    const now = new Date();
    const nextSrsState = computeNextSrsState(existing, input.rating);
    const nextIntervalDays = nextSrsState.nextIntervalDays;
    const nextDueAt = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);
    const updated = await vocabularyRepository.saveSrsState({
      userId: input.userId,
      vocabularyId: input.vocabularyId,
      nextIntervalDays,
      nextEaseFactor: nextSrsState.nextEaseFactor,
      nextDueAt,
      rating: input.rating,
      incrementLapse: nextSrsState.incrementLapse,
      reviewedAt: now
    });

    if (!updated) {
      throw new AppError(404, "VOCABULARY_NOT_FOUND", API_MESSAGES.errors.vocabularyNotFound);
    }

    return updated;
  }
};
