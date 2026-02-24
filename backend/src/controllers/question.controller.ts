import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { questionService } from "../services/question.service.js";
import { sendSuccess } from "../utils/http-response.js";

const generateSchema = z.object({
  topicId: z.coerce.number().int().positive(),
  cefrTarget: z.enum(["A1", "A2", "B1", "B2", "C1", "C2"]).optional()
});

const querySchema = z.object({
  topicId: z.coerce.number().int().positive().optional()
});

export const generateQuestionController = async (req: Request, res: Response): Promise<void> => {
  const payload = generateSchema.parse(req.body);
  const question = await questionService.generateAndStore({ ...payload, userId: req.auth.userId });
  sendSuccess(res, 201, API_MESSAGES.question.generated, question);
};

export const listQuestionsController = async (req: Request, res: Response): Promise<void> => {
  const query = querySchema.parse(req.query);
  const questions = await questionService.listQuestions(req.auth.userId, query.topicId);
  sendSuccess(res, 200, API_MESSAGES.question.listed, questions);
};
