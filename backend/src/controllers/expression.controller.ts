import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { expressionService } from "../services/expression.service.js";
import { sendSuccess } from "../utils/http-response.js";

const assessAttemptSchema = z.object({
  promptId: z.coerce.number().int().positive(),
  userAnswerText: z.string().trim().min(1)
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(30)
});

export const generateExpressionController = async (req: Request, res: Response): Promise<void> => {
  const prompt = await expressionService.generatePrompt(req.auth.userId);
  sendSuccess(res, 201, API_MESSAGES.expression.generated, prompt);
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
  const rows = await expressionService.listHistory({ userId: req.auth.userId, limit: query.limit });
  sendSuccess(res, 200, API_MESSAGES.expression.historyListed, rows);
};
