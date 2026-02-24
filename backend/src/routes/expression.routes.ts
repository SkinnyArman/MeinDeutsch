import { Router } from "express";
import {
  assessExpressionAttemptController,
  generateExpressionController,
  listExpressionHistoryController
} from "../controllers/expression.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const expressionRouter = Router();

expressionRouter.post("/generate", asyncHandler(generateExpressionController));
expressionRouter.post("/attempt", asyncHandler(assessExpressionAttemptController));
expressionRouter.get("/history", asyncHandler(listExpressionHistoryController));
