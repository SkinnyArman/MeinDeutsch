import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { COLLOCATION_GENERATION_CATEGORIES, type CollocationGenerationCategory } from "../constants/collocation-generation.config.js";
import { collocationService } from "../services/collocation.service.js";
import { sendSuccess } from "../utils/http-response.js";

const nextSchema = z.object({
  category: z.string().trim().min(1).optional()
});

const attemptSchema = z.object({
  promptId: z.coerce.number().int().positive(),
  userAnswerText: z.string().trim().min(1)
});

const historySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

const reviewAttemptSchema = z.object({
  userAnswerText: z.string().trim().min(1)
});

const reviewParamsSchema = z.object({
  id: z.coerce.number().int().positive()
});

const concreteCollocationCategories = COLLOCATION_GENERATION_CATEGORIES.filter((category) => category !== "random");
const resolveCategory = (category?: string): CollocationGenerationCategory => {
  if (category && category !== "random" && collocationService.isKnownCategory(category)) {
    return category;
  }

  return concreteCollocationCategories[Math.floor(Math.random() * concreteCollocationCategories.length)] as CollocationGenerationCategory;
};

export const listCollocationCategoriesController = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, 200, API_MESSAGES.collocation.categoriesListed, collocationService.listCategories());
};

export const nextCollocationController = async (req: Request, res: Response): Promise<void> => {
  const payload = nextSchema.parse(req.body ?? {});
  const prompt = await collocationService.getNextPrompt({
    userId: req.auth.userId,
    category: resolveCategory(payload.category)
  });
  sendSuccess(res, 200, API_MESSAGES.collocation.nextServed, prompt);
};

export const assessCollocationAttemptController = async (req: Request, res: Response): Promise<void> => {
  const payload = attemptSchema.parse(req.body);
  const attempt = await collocationService.assessAttempt({
    userId: req.auth.userId,
    promptId: payload.promptId,
    userAnswerText: payload.userAnswerText
  });
  sendSuccess(res, 201, API_MESSAGES.collocation.assessed, attempt);
};

export const listCollocationHistoryController = async (req: Request, res: Response): Promise<void> => {
  const query = historySchema.parse(req.query);
  const history = await collocationService.listHistory({
    userId: req.auth.userId,
    limit: query.limit,
    offset: query.offset
  });
  sendSuccess(res, 200, API_MESSAGES.collocation.historyListed, history);
};

export const listCollocationReviewController = async (req: Request, res: Response): Promise<void> => {
  const review = await collocationService.listDueReviewItems({ userId: req.auth.userId });
  sendSuccess(res, 200, API_MESSAGES.collocation.reviewListed, review);
};

export const assessCollocationReviewAttemptController = async (req: Request, res: Response): Promise<void> => {
  const params = reviewParamsSchema.parse(req.params);
  const payload = reviewAttemptSchema.parse(req.body);
  const result = await collocationService.assessReviewAttempt({
    userId: req.auth.userId,
    reviewItemId: params.id,
    userAnswerText: payload.userAnswerText
  });
  sendSuccess(res, 200, API_MESSAGES.collocation.reviewAssessed, result);
};
