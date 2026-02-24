import { vocabularyRepository } from "../repositories/vocabulary.repository.js";
import type { VocabularyItemRecord } from "../models/vocabulary-item.model.js";
import { AppError } from "../utils/app-error.js";
import { API_MESSAGES } from "../constants/api-messages.js";

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

  async listWords(input: { userId: number; category?: string; sourceAnswerLogId?: number }): Promise<VocabularyItemRecord[]> {
    return vocabularyRepository.list({
      userId: input.userId,
      category: input.category?.trim() || null,
      sourceAnswerLogId: input.sourceAnswerLogId
    });
  },

  async listCategories(userId: number): Promise<string[]> {
    return vocabularyRepository.listCategories(userId);
  },

  async reviewWord(input: { userId: number; vocabularyId: number; rating: number }): Promise<VocabularyItemRecord> {
    const existing = await vocabularyRepository.findById({
      userId: input.userId,
      vocabularyId: input.vocabularyId
    });

    if (!existing) {
      throw new AppError(404, "VOCABULARY_NOT_FOUND", API_MESSAGES.errors.vocabularyNotFound);
    }

    // SM-2 style rating mapping:
    // 1 = Again, 2 = Hard, 3 = Good, 4 = Easy
    const quality = Math.max(0, Math.min(5, input.rating + 1));
    const oldEase = existing.srsEaseFactor || 2.5;
    const nextEase = Math.max(1.3, oldEase + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)));
    const now = new Date();

    let nextIntervalDays: number;
    let incrementLapse = false;

    if (input.rating <= 1) {
      nextIntervalDays = 1;
      incrementLapse = true;
    } else if (existing.srsReviewCount === 0) {
      nextIntervalDays = input.rating >= 4 ? 4 : 2;
    } else if (existing.srsIntervalDays <= 1) {
      nextIntervalDays = input.rating >= 4 ? 4 : 3;
    } else {
      const base = existing.srsIntervalDays * nextEase;
      if (input.rating === 2) {
        nextIntervalDays = Math.max(2, Math.round(base * 0.85));
      } else if (input.rating === 3) {
        nextIntervalDays = Math.max(2, Math.round(base));
      } else {
        nextIntervalDays = Math.max(3, Math.round(base * 1.3));
      }
    }

    const nextDueAt = new Date(now.getTime() + nextIntervalDays * 24 * 60 * 60 * 1000);
    const updated = await vocabularyRepository.saveSrsState({
      userId: input.userId,
      vocabularyId: input.vocabularyId,
      nextIntervalDays,
      nextEaseFactor: Number(nextEase.toFixed(2)),
      nextDueAt,
      rating: input.rating,
      incrementLapse,
      reviewedAt: now
    });

    if (!updated) {
      throw new AppError(404, "VOCABULARY_NOT_FOUND", API_MESSAGES.errors.vocabularyNotFound);
    }

    return updated;
  }
};
