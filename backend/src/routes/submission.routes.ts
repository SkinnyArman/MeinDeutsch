import { Router } from "express";
import { submitTextController } from "../controllers/submission.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const submissionRouter = Router();

submissionRouter.post("/text", asyncHandler(submitTextController));
