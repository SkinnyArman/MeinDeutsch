import { Router } from "express";
import { generateQuestionController, listQuestionsController } from "../controllers/question.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const questionRouter = Router();

questionRouter.post("/generate", asyncHandler(generateQuestionController));
questionRouter.get("/", asyncHandler(listQuestionsController));
