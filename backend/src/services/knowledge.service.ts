import type { KnowledgeItemRecord } from "../models/knowledge-item.model.js";
import { knowledgeRepository } from "../repositories/knowledge.repository.js";

export const knowledgeService = {
  async listKnowledge(input: { userId: number; topicId?: number; limit?: number }): Promise<KnowledgeItemRecord[]> {
    return knowledgeRepository.list(input);
  }
};
