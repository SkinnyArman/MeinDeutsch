import { Router } from "express";
import { getDailyTalkStreakController } from "../controllers/streak.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const streakRouter = Router();

streakRouter.get("/daily-talk", asyncHandler(getDailyTalkStreakController));
