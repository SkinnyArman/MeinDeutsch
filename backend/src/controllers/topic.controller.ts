import type { Request, Response } from "express";
import { z } from "zod";
import { API_MESSAGES } from "../constants/api-messages.js";
import { topicService } from "../services/topic.service.js";
import { sendSuccess } from "../utils/http-response.js";

const createTopicSchema = z.object({
  name: z.string().min(1),
  description: z.string().trim().optional()
});

export const createTopicController = async (req: Request, res: Response): Promise<void> => {
  const payload = createTopicSchema.parse(req.body);
  const topic = await topicService.createTopic(payload);
  sendSuccess(res, 201, API_MESSAGES.topic.created, topic);
};

export const listTopicsController = async (_req: Request, res: Response): Promise<void> => {
  const topics = await topicService.listTopics();
  sendSuccess(res, 200, API_MESSAGES.topic.listed, topics);
};
