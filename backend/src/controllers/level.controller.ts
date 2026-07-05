import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { CEFR_LEVELS } from "../ai/analysis.client.js";
import { levelService } from "../services/level.service.js";
import { sendSuccess } from "../utils/http-response.js";

const assessSchema = z.object({
  selfEstimate: z.enum([...CEFR_LEVELS, "unknown"]),
  answers: z
    .array(
      z.object({
        questionId: z.string().trim().min(1),
        selectedOptionId: z.string().trim().min(1)
      })
    )
    .min(1)
    .max(30),
  writingAnswer: z.string().trim().max(1200)
});

const setLevelSchema = z.object({
  cefrLevel: z.enum(CEFR_LEVELS)
});

export const getLevelController = async (req: Request, res: Response): Promise<void> => {
  const level = await levelService.getLevel(req.auth.userId);
  sendSuccess(res, 200, API_MESSAGES.level.fetched, level);
};

export const getLevelExamController = async (_req: Request, res: Response): Promise<void> => {
  const exam = await levelService.getExam();
  sendSuccess(res, 200, API_MESSAGES.level.examGenerated, exam);
};

export const assessLevelController = async (req: Request, res: Response): Promise<void> => {
  const payload = assessSchema.parse(req.body);
  const level = await levelService.assessExam({
    userId: req.auth.userId,
    selfEstimate: payload.selfEstimate,
    answers: payload.answers,
    writingAnswer: payload.writingAnswer
  });
  sendSuccess(res, 201, API_MESSAGES.level.assessed, level);
};

export const setLevelController = async (req: Request, res: Response): Promise<void> => {
  const payload = setLevelSchema.parse(req.body);
  const level = await levelService.setLevelManually({ userId: req.auth.userId, cefrLevel: payload.cefrLevel });
  sendSuccess(res, 200, API_MESSAGES.level.updated, level);
};
