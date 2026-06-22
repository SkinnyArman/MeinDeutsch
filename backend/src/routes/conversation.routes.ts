import { Router } from "express";
import {
  deleteConversationController,
  endConversationController,
  getConversationController,
  listConversationScenariosController,
  listConversationsController,
  sendConversationMessageController,
  startConversationController
} from "../controllers/conversation.controller.js";
import { asyncHandler } from "../utils/async-handler.js";

export const conversationRouter = Router();

conversationRouter.get("/scenarios", asyncHandler(listConversationScenariosController));
conversationRouter.get("/", asyncHandler(listConversationsController));
conversationRouter.post("/", asyncHandler(startConversationController));
conversationRouter.get("/:id", asyncHandler(getConversationController));
conversationRouter.post("/:id/message", asyncHandler(sendConversationMessageController));
conversationRouter.post("/:id/end", asyncHandler(endConversationController));
conversationRouter.delete("/:id", asyncHandler(deleteConversationController));
