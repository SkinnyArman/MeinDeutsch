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
    topicId: number;
    questionText: string;
    cefrTarget?: string;
    generationPrompt: string;
  }): Promise<QuestionRecord> {
    const repo = appDataSource.getRepository(Question);
    const created = repo.create({
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

  async list(topicId?: number): Promise<QuestionRecord[]> {
    const repo = appDataSource.getRepository(Question);
    const rows = await repo.find({
      where: topicId ? { topicId: String(topicId) } : {},
      relations: { topic: true },
      order: { createdAt: "DESC" }
    });

    return rows.map(toQuestionRecord);
  },

  async findById(questionId: number): Promise<QuestionRecord | null> {
    const repo = appDataSource.getRepository(Question);
    const row = await repo.findOne({
      where: { id: String(questionId) },
      relations: { topic: true }
    });

    return row ? toQuestionRecord(row) : null;
  }
};
