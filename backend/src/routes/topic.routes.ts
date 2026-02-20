import { Router } from "express";
import { createTopicController, deleteTopicController, listTopicsController } from "../controllers/topic.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const topicRouter = Router();

topicRouter.post("/", asyncHandler(createTopicController));
topicRouter.get("/", asyncHandler(listTopicsController));
topicRouter.delete("/:topicId", asyncHandler(deleteTopicController));
