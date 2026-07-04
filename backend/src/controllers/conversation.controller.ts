import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { conversationService } from "../services/conversation.service.js";
import { sendSuccess } from "../utils/http-response.js";

const startSchema = z.object({
  // Optional: omit (or send "random") to start a surprise scenario.
  scenarioId: z.string().trim().min(1).optional()
});

const messageSchema = z.object({
  content: z.string().trim().min(1).max(2000)
});

const idParamSchema = z.object({
  id: z.coerce.number().int().positive()
});

const historyQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional(),
  offset: z.coerce.number().int().min(0).optional()
});

export const listConversationScenariosController = async (_req: Request, res: Response): Promise<void> => {
  sendSuccess(res, 200, API_MESSAGES.conversation.scenariosListed, conversationService.listScenarios());
};

export const startConversationController = async (req: Request, res: Response): Promise<void> => {
  const payload = startSchema.parse(req.body ?? {});
  const data = await conversationService.start({ userId: req.auth.userId, scenarioId: payload.scenarioId });
  sendSuccess(res, 201, API_MESSAGES.conversation.started, data);
};

export const sendConversationMessageController = async (req: Request, res: Response): Promise<void> => {
  const { id } = idParamSchema.parse(req.params);
  const payload = messageSchema.parse(req.body);
  const data = await conversationService.sendMessage({
    userId: req.auth.userId,
    conversationId: id,
    content: payload.content
  });
  sendSuccess(res, 201, API_MESSAGES.conversation.replied, data);
};

export const endConversationController = async (req: Request, res: Response): Promise<void> => {
  const { id } = idParamSchema.parse(req.params);
  const conversation = await conversationService.end({ userId: req.auth.userId, conversationId: id });
  sendSuccess(res, 200, API_MESSAGES.conversation.ended, conversation);
};

export const getConversationController = async (req: Request, res: Response): Promise<void> => {
  const { id } = idParamSchema.parse(req.params);
  const data = await conversationService.getConversation({ userId: req.auth.userId, conversationId: id });
  sendSuccess(res, 200, API_MESSAGES.conversation.fetched, data);
};

export const deleteConversationController = async (req: Request, res: Response): Promise<void> => {
  const { id } = idParamSchema.parse(req.params);
  await conversationService.deleteConversation({ userId: req.auth.userId, conversationId: id });
  sendSuccess(res, 200, API_MESSAGES.conversation.deleted, { id });
};

export const listConversationsController = async (req: Request, res: Response): Promise<void> => {
  const query = historyQuerySchema.parse(req.query);
  const data = await conversationService.listHistory({
    userId: req.auth.userId,
    limit: query.limit,
    offset: query.offset
  });
  sendSuccess(res, 200, API_MESSAGES.conversation.listed, data);
};
