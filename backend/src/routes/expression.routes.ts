import { Router } from "express";
import {
  assessExpressionReviewAttemptController,
  assessExpressionAttemptController,
  generateExpressionController,
  listExpressionHistoryController,
  listExpressionReviewController
} from "../controllers/expression.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const expressionRouter = Router();

expressionRouter.post("/generate", asyncHandler(generateExpressionController));
expressionRouter.post("/attempt", asyncHandler(assessExpressionAttemptController));
expressionRouter.get("/history", asyncHandler(listExpressionHistoryController));
expressionRouter.get("/review", asyncHandler(listExpressionReviewController));
expressionRouter.post("/review/:id/attempt", asyncHandler(assessExpressionReviewAttemptController));
