import { appDataSource } from "../db/pool.js";
import { Topic, type TopicRecord } from "../models/topic.model.js";

const toTopicRecord = (entity: Topic): TopicRecord => ({
  id: Number(entity.id),
  name: entity.name,
  description: entity.description,
  createdAt: entity.createdAt.toISOString()
});

export const topicRepository = {
  async create(input: { name: string; description?: string | null }): Promise<TopicRecord> {
    const repo = appDataSource.getRepository(Topic);
    const created = repo.create({
      name: input.name,
      description: input.description ?? null
    });

    const saved = await repo.save(created);
    return toTopicRecord(saved);
  },

  async list(): Promise<TopicRecord[]> {
    const repo = appDataSource.getRepository(Topic);
    const rows = await repo.find({ order: { createdAt: "DESC" } });
    return rows.map(toTopicRecord);
  },

  async findById(topicId: number): Promise<TopicRecord | null> {
    const repo = appDataSource.getRepository(Topic);
    const row = await repo.findOne({ where: { id: String(topicId) } });
    return row ? toTopicRecord(row) : null;
  }
};
