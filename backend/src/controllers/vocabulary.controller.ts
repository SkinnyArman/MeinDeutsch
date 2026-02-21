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
  category: z.string().trim().optional()
});

export const saveVocabularyController = async (req: Request, res: Response): Promise<void> => {
  const payload = saveVocabularySchema.parse(req.body);
  const result = await vocabularyService.saveWord(payload);
  sendSuccess(res, result.created ? 201 : 200, API_MESSAGES.vocabulary.saved, result);
};

export const listVocabularyController = async (req: Request, res: Response): Promise<void> => {
  const query = listVocabularyQuerySchema.parse(req.query);
  const entries = await vocabularyService.listWords({ category: query.category });
  sendSuccess(res, 200, API_MESSAGES.vocabulary.listed, entries);
};

export const listVocabularyCategoriesController = async (_req: Request, res: Response): Promise<void> => {
  const categories = await vocabularyService.listCategories();
  sendSuccess(res, 200, API_MESSAGES.vocabulary.categoriesListed, categories);
};
