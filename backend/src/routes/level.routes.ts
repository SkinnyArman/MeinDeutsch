import { Router } from "express";
import {
  assessLevelController,
  getLevelController,
  getLevelExamController,
  setLevelController
} from "../controllers/level.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const levelRouter = Router();

levelRouter.get("/", asyncHandler(getLevelController));
levelRouter.get("/exam", asyncHandler(getLevelExamController));
levelRouter.post("/assess", asyncHandler(assessLevelController));
levelRouter.post("/", asyncHandler(setLevelController));
