import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { CEFR_LEVELS } from "../ai/analysis.client.js";
import { levelService } from "../services/level.service.js";
import { sendSuccess } from "../utils/http-response.js";

const assessSchema = z.object({
  answers: z
    .array(
      z.object({
        targetLevel: z.string().trim().min(1),
        questionText: z.string().trim().min(1),
        answerText: z.string()
      })
    )
    .min(1)
    .max(12)
});

const setLevelSchema = z.object({
  cefrLevel: z.enum(CEFR_LEVELS)
});

export const getLevelController = async (req: Request, res: Response): Promise<void> => {
  const level = await levelService.getLevel(req.auth.userId);
  sendSuccess(res, 200, API_MESSAGES.level.fetched, level);
};

export const getLevelExamController = async (_req: Request, res: Response): Promise<void> => {
  const questions = await levelService.getExam();
  sendSuccess(res, 200, API_MESSAGES.level.examGenerated, { questions });
};

export const assessLevelController = async (req: Request, res: Response): Promise<void> => {
  const payload = assessSchema.parse(req.body);
  const level = await levelService.assessExam({ userId: req.auth.userId, answers: payload.answers });
  sendSuccess(res, 201, API_MESSAGES.level.assessed, level);
};

export const setLevelController = async (req: Request, res: Response): Promise<void> => {
  const payload = setLevelSchema.parse(req.body);
  const level = await levelService.setLevelManually({ userId: req.auth.userId, cefrLevel: payload.cefrLevel });
  sendSuccess(res, 200, API_MESSAGES.level.updated, level);
};
