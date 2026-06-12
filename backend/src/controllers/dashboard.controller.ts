import type { Request, Response } from "express";
import { API_MESSAGES } from "../constants/api-messages.js";
import { dashboardService } from "../services/dashboard.service.js";
import { sendSuccess } from "../utils/http-response.js";

export const getDashboardOverviewController = async (req: Request, res: Response): Promise<void> => {
  const overview = await dashboardService.getOverview(req.auth.userId);
  sendSuccess(res, 200, API_MESSAGES.dashboard.fetched, overview);
};
