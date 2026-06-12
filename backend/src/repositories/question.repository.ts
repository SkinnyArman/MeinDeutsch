import { IsNull } from "typeorm";
import { appDataSource } from "../db/pool.js";
import { Question, type QuestionRecord } from "../models/question.model.js";

const toQuestionRecord = (entity: Question): QuestionRecord => ({
  id: Number(entity.id),
  topicId: Number(entity.topicId),
  topicName: entity.topic?.name,
  questionText: entity.questionText,
  cefrTarget: entity.cefrTarget,
  generationPrompt: entity.generationPrompt,
  source: entity.source,
  createdAt: entity.createdAt.toISOString()
});

export const questionRepository = {
  async createAIQuestion(input: {
    userId: number;
    topicId: number;
    questionText: string;
    cefrTarget?: string;
    generationPrompt: string;
  }): Promise<QuestionRecord> {
    const repo = appDataSource.getRepository(Question);
    const created = repo.create({
      userId: String(input.userId),
      topicId: String(input.topicId),
      questionText: input.questionText,
      cefrTarget: input.cefrTarget ?? null,
      generationPrompt: input.generationPrompt,
      source: "ai"
    });

    const saved = await repo.save(created);
    const loaded = await repo.findOne({ where: { id: saved.id }, relations: { topic: true } });
    return toQuestionRecord(loaded ?? saved);
  },

  async list(userId: number, topicId?: number): Promise<QuestionRecord[]> {
    const repo = appDataSource.getRepository(Question);
    const rows = await repo.find({
      where: {
        userId: String(userId),
        ...(topicId ? { topicId: String(topicId) } : {})
      },
      relations: { topic: true },
      order: { createdAt: "DESC" }
    });

    return rows.map(toQuestionRecord);
  },

  async listUnseenByTopic(input: { userId: number; topicId: number; limit: number }): Promise<QuestionRecord[]> {
    const repo = appDataSource.getRepository(Question);
    const rows = await repo.find({
      where: {
        userId: String(input.userId),
        topicId: String(input.topicId),
        viewedAt: IsNull()
      },
      relations: { topic: true },
      order: { createdAt: "ASC" },
      take: input.limit
    });
    return rows.map(toQuestionRecord);
  },

  async findLeastRecentlyViewed(input: { userId: number; topicId: number }): Promise<QuestionRecord | null> {
    const repo = appDataSource.getRepository(Question);
    const row = await repo
      .createQueryBuilder("question")
      .leftJoinAndSelect("question.topic", "topic")
      .where("question.user_id = :userId", { userId: String(input.userId) })
      .andWhere("question.topic_id = :topicId", { topicId: String(input.topicId) })
      .andWhere("question.viewed_at IS NOT NULL")
      .orderBy("question.viewed_at", "ASC")
      .getOne();
    return row ? toQuestionRecord(row) : null;
  },

  async markViewed(input: { userId: number; questionId: number }): Promise<void> {
    const repo = appDataSource.getRepository(Question);
    await repo.update(
      { id: String(input.questionId), userId: String(input.userId) },
      { viewedAt: new Date() }
    );
  },

  async listRecentQuestionTexts(input: { userId: number; topicId: number; limit: number }): Promise<string[]> {
    const repo = appDataSource.getRepository(Question);
    const rows = await repo.find({
      where: { userId: String(input.userId), topicId: String(input.topicId) },
      order: { createdAt: "DESC" },
      take: input.limit,
      select: { questionText: true }
    });
    return rows.map((row) => row.questionText);
  },

  async findById(questionId: number, userId: number): Promise<QuestionRecord | null> {
    const repo = appDataSource.getRepository(Question);
    const row = await repo.findOne({
      where: { id: String(questionId), userId: String(userId) },
      relations: { topic: true }
    });

    return row ? toQuestionRecord(row) : null;
  }
};
