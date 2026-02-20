import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { knowledgeService } from "../services/knowledge.service.js";
import { sendSuccess } from "../utils/http-response.js";

const listQuerySchema = z.object({
  topicId: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional()
});

export const listKnowledgeController = async (req: Request, res: Response): Promise<void> => {
  const query = listQuerySchema.parse(req.query);
  const rows = await knowledgeService.listKnowledge(query);
  sendSuccess(res, 200, API_MESSAGES.knowledge.listed, rows);
};
