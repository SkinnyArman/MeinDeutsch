import { Router } from "express";
import {
  listVocabularyCategoriesController,
  listVocabularyController,
  reviewVocabularyController,
  saveVocabularyController
} from "../controllers/vocabulary.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const vocabularyRouter = Router();

vocabularyRouter.post("/", asyncHandler(saveVocabularyController));
vocabularyRouter.get("/categories", asyncHandler(listVocabularyCategoriesController));
vocabularyRouter.post("/:id/review", asyncHandler(reviewVocabularyController));
vocabularyRouter.get("/", asyncHandler(listVocabularyController));
