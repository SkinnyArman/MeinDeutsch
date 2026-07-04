import type { Request, Response } from "express";
import { API_MESSAGES } from "../constants/api-messages.js";
import { progressService } from "../services/progress.service.js";
import { sendSuccess } from "../utils/http-response.js";

export const getProgressController = async (req: Request, res: Response): Promise<void> => {
  const overview = await progressService.getProgress(req.auth.userId);
  sendSuccess(res, 200, API_MESSAGES.progress.fetched, overview);
};
