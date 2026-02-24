import { API_MESSAGES } from "../constants/api-messages.js";
import type { TopicRecord } from "../models/topic.model.js";
import { topicRepository } from "../repositories/topic.repository.js";
import { AppError } from "../utils/app-error.js";

export const topicService = {
  async createTopic(input: { userId: number; name: string; description?: string | null }): Promise<TopicRecord> {
    return topicRepository.create(input);
  },

  async listTopics(userId: number): Promise<TopicRecord[]> {
    return topicRepository.list(userId);
  },

  async deleteTopic(topicId: number, userId: number): Promise<void> {
    const deleted = await topicRepository.deleteById(topicId, userId);
    if (!deleted) {
      throw new AppError(404, "TOPIC_NOT_FOUND", API_MESSAGES.errors.topicNotFound);
    }
  }
};
