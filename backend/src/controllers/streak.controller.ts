import type { Request, Response } from "express";
import { API_MESSAGES } from "../constants/api-messages.js";
import { streakService } from "../services/streak.service.js";
import { sendSuccess } from "../utils/http-response.js";

export const getDailyTalkStreakController = async (_req: Request, res: Response): Promise<void> => {
  const streak = await streakService.getDailyTalkStatus();
  sendSuccess(res, 200, API_MESSAGES.streak.fetched, streak);
};
