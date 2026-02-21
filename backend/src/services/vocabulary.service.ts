import { vocabularyRepository } from "../repositories/vocabulary.repository.js";
import type { VocabularyItemRecord } from "../models/vocabulary-item.model.js";

interface SaveVocabularyInput {
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
      word: input.word,
      description: input.description,
      examples: input.examples,
      category,
      sourceAnswerLogId: input.sourceAnswerLogId,
      sourceQuestionId: input.sourceQuestionId
    });
  },

  async listWords(input: { category?: string }): Promise<VocabularyItemRecord[]> {
    return vocabularyRepository.list({ category: input.category?.trim() || null });
  },

  async listCategories(): Promise<string[]> {
    return vocabularyRepository.listCategories();
  }
};
