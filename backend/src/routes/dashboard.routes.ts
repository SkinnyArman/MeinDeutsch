import { Router } from "express";
import { getDashboardOverviewController } from "../controllers/dashboard.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const dashboardRouter = Router();

dashboardRouter.get("/overview", asyncHandler(getDashboardOverviewController));
