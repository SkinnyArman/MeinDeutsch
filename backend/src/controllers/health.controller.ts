import type { Request, Response } from "express";
import { API_MESSAGES } from "../constants/api-messages.js";
import { appDataSource } from "../db/pool.js";
import { sendSuccess } from "../utils/http-response.js";

export const healthController = async (_req: Request, res: Response): Promise<void> => {
  if (!appDataSource.isInitialized) {
    await appDataSource.initialize();
  }

  sendSuccess(res, 200, API_MESSAGES.health.ok, {
    service: "meindeutsch-backend"
  });
};
