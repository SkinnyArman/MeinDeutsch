import { Router } from "express";
import {
  listVocabularyCategoriesController,
  listVocabularyController,
  saveVocabularyController
} from "../controllers/vocabulary.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const vocabularyRouter = Router();

vocabularyRouter.post("/", asyncHandler(saveVocabularyController));
vocabularyRouter.get("/", asyncHandler(listVocabularyController));
vocabularyRouter.get("/categories", asyncHandler(listVocabularyCategoriesController));
