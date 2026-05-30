import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { EXPRESSION_GENERATION_CATEGORIES } from "../ai/analysis.client.js";
import { expressionService } from "../services/expression.service.js";
import { sendSuccess } from "../utils/http-response.js";

const assessAttemptSchema = z.object({
  promptId: z.coerce.number().int().positive(),
  userAnswerText: z.string().trim().min(1)
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(30),
  offset: z.coerce.number().int().min(0).default(0)
});

const reviewQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50)
});

const reviewAttemptParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const reviewAttemptSchema = z.object({
  userAnswerText: z.string().trim().min(1)
});

const generateExpressionSchema = z.object({
  category: z.enum(EXPRESSION_GENERATION_CATEGORIES).default("random")
});
const generateExpressionPoolSchema = z.object({
  categories: z.array(z.enum(EXPRESSION_GENERATION_CATEGORIES)).min(1).optional(),
  countPerCategory: z.coerce.number().int().min(1).max(10).default(5)
});

export const generateExpressionController = async (req: Request, res: Response): Promise<void> => {
  const payload = generateExpressionSchema.parse(req.body ?? {});
  const prompt = await expressionService.generatePrompt(req.auth.userId, payload.category);
  sendSuccess(res, 201, API_MESSAGES.expression.generated, prompt);
};

export const nextExpressionController = async (req: Request, res: Response): Promise<void> => {
  const payload = generateExpressionSchema.parse(req.body ?? {});
  const prompt = await expressionService.getNextPrompt({
    userId: req.auth.userId,
    category: payload.category
  });
  sendSuccess(res, 200, API_MESSAGES.expression.generated, prompt);
};

export const generateExpressionPoolController = async (req: Request, res: Response): Promise<void> => {
  const payload = generateExpressionPoolSchema.parse(req.body ?? {});
  const uniqueCategories = Array.from(new Set(payload.categories ?? [...EXPRESSION_GENERATION_CATEGORIES]));
  const result = await expressionService.generatePromptPool({
    userId: req.auth.userId,
    categories: uniqueCategories,
    countPerCategory: payload.countPerCategory
  });
  sendSuccess(res, 201, API_MESSAGES.expression.generated, result);
};

export const assessExpressionAttemptController = async (req: Request, res: Response): Promise<void> => {
  const payload = assessAttemptSchema.parse(req.body);
  const attempt = await expressionService.assessAttempt({
    userId: req.auth.userId,
    promptId: payload.promptId,
    userAnswerText: payload.userAnswerText
  });
  sendSuccess(res, 201, API_MESSAGES.expression.assessed, attempt);
};

export const listExpressionHistoryController = async (req: Request, res: Response): Promise<void> => {
  const query = historyQuerySchema.parse(req.query);
  const data = await expressionService.listHistory({
    userId: req.auth.userId,
    limit: query.limit,
    offset: query.offset
  });
  sendSuccess(res, 200, API_MESSAGES.expression.historyListed, data);
};

export const listExpressionReviewController = async (req: Request, res: Response): Promise<void> => {
  const query = reviewQuerySchema.parse(req.query);
  const data = await expressionService.listDueReviewItems({
    userId: req.auth.userId,
    limit: query.limit
  });
  sendSuccess(res, 200, API_MESSAGES.expression.reviewListed, data);
};

export const assessExpressionReviewAttemptController = async (req: Request, res: Response): Promise<void> => {
  const { id } = reviewAttemptParamSchema.parse(req.params);
  const payload = reviewAttemptSchema.parse(req.body);
  const result = await expressionService.assessReviewAttempt({
    userId: req.auth.userId,
    reviewItemId: id,
    userAnswerText: payload.userAnswerText
  });
  sendSuccess(res, 200, API_MESSAGES.expression.reviewAssessed, result);
};
