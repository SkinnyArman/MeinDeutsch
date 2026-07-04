import { Router } from "express";
import { getProgressController } from "../controllers/progress.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const progressRouter = Router();

progressRouter.get("/", asyncHandler(getProgressController));
