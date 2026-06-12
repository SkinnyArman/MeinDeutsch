import { Router } from "express";
import {
  assessCollocationAttemptController,
  assessCollocationReviewAttemptController,
  listCollocationCategoriesController,
  listCollocationHistoryController,
  listCollocationReviewController,
  nextCollocationController
} from "../controllers/collocation.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const collocationRouter = Router();

collocationRouter.get("/categories", asyncHandler(listCollocationCategoriesController));
collocationRouter.post("/next", asyncHandler(nextCollocationController));
collocationRouter.post("/attempt", asyncHandler(assessCollocationAttemptController));
collocationRouter.get("/history", asyncHandler(listCollocationHistoryController));
collocationRouter.get("/review", asyncHandler(listCollocationReviewController));
collocationRouter.post("/review/:id/attempt", asyncHandler(assessCollocationReviewAttemptController));
