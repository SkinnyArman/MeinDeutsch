import { Router } from "express";
import {
  assessExpressionReviewAttemptController,
  assessExpressionAttemptController,
  generateExpressionController,
  generateExpressionPoolController,
  nextExpressionController,
  listExpressionHistoryController,
  listExpressionReviewController
} from "../controllers/expression.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const expressionRouter = Router();

expressionRouter.post("/generate", asyncHandler(generateExpressionController));
expressionRouter.post("/pool", asyncHandler(generateExpressionPoolController));
expressionRouter.post("/next", asyncHandler(nextExpressionController));
expressionRouter.post("/attempt", asyncHandler(assessExpressionAttemptController));
expressionRouter.get("/history", asyncHandler(listExpressionHistoryController));
expressionRouter.get("/review", asyncHandler(listExpressionReviewController));
expressionRouter.post("/review/:id/attempt", asyncHandler(assessExpressionReviewAttemptController));
