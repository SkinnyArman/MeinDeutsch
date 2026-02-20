import { Router } from "express";
import { listKnowledgeController } from "../controllers/knowledge.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const knowledgeRouter = Router();

knowledgeRouter.get("/", asyncHandler(listKnowledgeController));
