import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { vocabularyService } from "../services/vocabulary.service.js";
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
  sourceAnswerLogId: z.coerce.number().int().positive().optional()
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
  const entries = await vocabularyService.listWords({
    userId: req.auth.userId,
    category: query.category,
    sourceAnswerLogId: query.sourceAnswerLogId
  });
  sendSuccess(res, 200, API_MESSAGES.vocabulary.listed, entries);
};

export const listVocabularyCategoriesController = async (req: Request, res: Response): Promise<void> => {
  const categories = await vocabularyService.listCategories(req.auth.userId);
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
