import { Router } from "express";
import { submitTextController, listSubmissionsController, getSubmissionController } from "../controllers/submission.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const submissionRouter = Router();

submissionRouter.get("/", asyncHandler(listSubmissionsController));
submissionRouter.post("/text", asyncHandler(submitTextController));
submissionRouter.get("/:id", asyncHandler(getSubmissionController));
