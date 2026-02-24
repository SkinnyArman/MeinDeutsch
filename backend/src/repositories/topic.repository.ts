import { appDataSource } from "../db/pool.js";
import { Topic, type TopicRecord } from "../models/topic.model.js";

const toTopicRecord = (entity: Topic): TopicRecord => ({
  id: Number(entity.id),
  name: entity.name,
  description: entity.description,
  createdAt: entity.createdAt.toISOString()
});

export const topicRepository = {
  async create(input: { userId: number; name: string; description?: string | null }): Promise<TopicRecord> {
    const repo = appDataSource.getRepository(Topic);
    const created = repo.create({
      userId: String(input.userId),
      name: input.name,
      description: input.description ?? null
    });

    const saved = await repo.save(created);
    return toTopicRecord(saved);
  },

  async list(userId: number): Promise<TopicRecord[]> {
    const repo = appDataSource.getRepository(Topic);
    const rows = await repo.find({ where: { userId: String(userId) }, order: { createdAt: "DESC" } });
    return rows.map(toTopicRecord);
  },

  async findById(topicId: number, userId: number): Promise<TopicRecord | null> {
    const repo = appDataSource.getRepository(Topic);
    const row = await repo.findOne({ where: { id: String(topicId), userId: String(userId) } });
    return row ? toTopicRecord(row) : null;
  },

  async deleteById(topicId: number, userId: number): Promise<boolean> {
    const repo = appDataSource.getRepository(Topic);
    const result = await repo.delete({ id: String(topicId), userId: String(userId) });
    return Boolean(result.affected && result.affected > 0);
  }
};
