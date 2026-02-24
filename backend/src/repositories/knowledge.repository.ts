import { appDataSource } from "../db/pool.js";
import { type AnalysisResult } from "../types/submission.types.js";
import { KnowledgeItem, type KnowledgeItemRecord } from "../models/knowledge-item.model.js";

interface CreateKnowledgeInput {
  userId: number;
  topicId?: number;
  topicName?: string;
  questionId?: number;
  questionText: string;
  answerLogId: number;
  answerText: string;
  analysis: AnalysisResult;
}

const toKnowledgeRecord = (entity: KnowledgeItem): KnowledgeItemRecord => ({
  id: Number(entity.id),
  topicId: entity.topicId ? Number(entity.topicId) : null,
  topicName: entity.topic?.name,
  questionId: entity.questionId ? Number(entity.questionId) : null,
  answerLogId: entity.answerLogId ? Number(entity.answerLogId) : null,
  itemType: entity.itemType,
  textChunk: entity.textChunk,
  metadata: entity.metadata,
  createdAt: entity.createdAt.toISOString()
});

const buildTextChunk = (input: CreateKnowledgeInput): string => {
  const mistakes = input.analysis.errors
    .map((error) => {
      const details = [error.message, error.description, error.evidence ? `Excerpt: ${error.evidence}` : ""]
        .filter(Boolean)
        .join(" ");
      return `${error.type}: ${details}`;
    })
    .join("; ");
  const words = input.analysis.contextualWordSuggestions.map((item) => item.word).join(", ");
  const tips = input.analysis.tips.join(" | ");

  return [
    `Topic: ${input.topicName ?? "General"}`,
    `Question: ${input.questionText}`,
    `Answer: ${input.answerText}`,
    `Corrected: ${input.analysis.correctedText}`,
    `CEFR: ${input.analysis.cefrLevel}`,
    `Mistakes: ${mistakes || "None"}`,
    `Suggested words: ${words || "None"}`,
    `Tips: ${tips || "None"}`
  ].join("\n");
};

export const knowledgeRepository = {
  async createFromSubmission(input: CreateKnowledgeInput): Promise<KnowledgeItemRecord> {
    const repo = appDataSource.getRepository(KnowledgeItem);

    const created = repo.create({
      userId: String(input.userId),
      topicId: input.topicId ? String(input.topicId) : null,
      questionId: input.questionId ? String(input.questionId) : null,
      answerLogId: String(input.answerLogId),
      itemType: "daily_talk_submission",
      textChunk: buildTextChunk(input),
      metadata: {
        topicName: input.topicName ?? null,
        questionText: input.questionText,
        answerText: input.answerText,
        correctedText: input.analysis.correctedText,
        cefrLevel: input.analysis.cefrLevel,
        mistakes: input.analysis.errors,
        contextualWordSuggestions: input.analysis.contextualWordSuggestions,
        tips: input.analysis.tips
      }
    });

    const saved = await repo.save(created);
    const loaded = await repo.findOne({ where: { id: saved.id }, relations: { topic: true } });
    return toKnowledgeRecord(loaded ?? saved);
  },

  async list(input: { userId: number; topicId?: number; limit?: number }): Promise<KnowledgeItemRecord[]> {
    const repo = appDataSource.getRepository(KnowledgeItem);

    const qb = repo
      .createQueryBuilder("knowledge")
      .leftJoinAndSelect("knowledge.topic", "topic")
      .where("knowledge.user_id = :userId", { userId: String(input.userId) })
      .orderBy("knowledge.createdAt", "DESC")
      .take(input.limit ?? 30);

    if (input.topicId) {
      qb.andWhere("knowledge.topicId = :topicId", { topicId: String(input.topicId) });
    }

    const rows = await qb.getMany();
    return rows.map(toKnowledgeRecord);
  }
};
