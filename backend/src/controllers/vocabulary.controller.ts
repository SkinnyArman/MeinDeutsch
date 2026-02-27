import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { vocabularyService } from "../services/vocabulary.service.js";
import { vocabularyRepository } from "../repositories/vocabulary.repository.js";
import { sendSuccess } from "../utils/http-response.js";

const saveVocabularySchema = z.object({
  word: z.string().trim().min(1),
  description: z.string().trim().min(1),
  examples: z.array(z.string().trim().min(1)).min(1),
  category: z.string().trim().optional(),
  sourceAnswerLogId: z.coerce.number().int().positive().optional(),
  sourceQuestionId: z.coerce.number().int().positive().optional()
});

const listVocabularyQuerySchema = z.object({
  category: z.string().trim().optional(),
  sourceAnswerLogId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().min(1).max(500).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const reviewVocabularyParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const reviewVocabularySchema = z.object({
  rating: z.coerce.number().int().min(1).max(4)
});

export const saveVocabularyController = async (req: Request, res: Response): Promise<void> => {
  const payload = saveVocabularySchema.parse(req.body);
  const result = await vocabularyService.saveWord({ ...payload, userId: req.auth.userId });
  sendSuccess(res, result.created ? 201 : 200, API_MESSAGES.vocabulary.saved, result);
};

export const listVocabularyController = async (req: Request, res: Response): Promise<void> => {
  const query = listVocabularyQuerySchema.parse(req.query);
  const [items, total] = await Promise.all([
    vocabularyService.listWords({
      userId: req.auth.userId,
      category: query.category,
      sourceAnswerLogId: query.sourceAnswerLogId,
      limit: query.limit,
      offset: query.offset
    }),
    vocabularyRepository.count({
      userId: req.auth.userId,
      category: query.category?.trim() || null,
      sourceAnswerLogId: query.sourceAnswerLogId
    })
  ]);
  const limit = query.limit ?? items.length;
  const offset = query.offset ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const page = Math.floor(offset / limit) + 1;
  sendSuccess(res, 200, API_MESSAGES.vocabulary.listed, {
    items,
    total,
    limit,
    offset,
    page,
    totalPages,
    hasMore: offset + items.length < total
  });
};

export const listVocabularyCategoriesController = async (req: Request, res: Response): Promise<void> => {
  const categories = await vocabularyService.listCategoryMeta(req.auth.userId);
  sendSuccess(res, 200, API_MESSAGES.vocabulary.categoriesListed, categories);
};

export const reviewVocabularyController = async (req: Request, res: Response): Promise<void> => {
  const { id } = reviewVocabularyParamSchema.parse(req.params);
  const payload = reviewVocabularySchema.parse(req.body);
  const entry = await vocabularyService.reviewWord({
    userId: req.auth.userId,
    vocabularyId: id,
    rating: payload.rating
  });
  sendSuccess(res, 200, API_MESSAGES.vocabulary.reviewed, entry);
};
