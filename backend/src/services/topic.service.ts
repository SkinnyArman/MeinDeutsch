import type { TopicRecord } from "../models/topic.model.js";
import { topicRepository } from "../repositories/topic.repository.js";

export const topicService = {
  async createTopic(input: { name: string; description?: string | null }): Promise<TopicRecord> {
    return topicRepository.create(input);
  },

  async listTopics(): Promise<TopicRecord[]> {
    return topicRepository.list();
  }
};
