import { appDataSource } from "../db/pool.js";
import {
  CollocationAttempt,
  type CollocationAttemptHistoryPoint,
  type CollocationAttemptRecord
} from "../models/collocation-attempt.model.js";
import { CollocationPrompt, type CollocationPromptRecord } from "../models/collocation-prompt.model.js";
import { CollocationPromptView } from "../models/collocation-prompt-view.model.js";

export const normalizeCollocationText = (text: string): string =>
  text.trim().toLowerCase().replace(/\s+/g, " ");

const toPromptRecord = (entity: CollocationPrompt): CollocationPromptRecord => ({
  id: Number(entity.id),
  englishText: entity.englishText,
  clozeSentence: entity.clozeSentence,
  collocationType: entity.collocationType,
  generationCategory: entity.generationCategory,
  createdAt: entity.createdAt.toISOString()
});

/** Full prompt including the answer fields; server-side use only. */
export interface CollocationPromptInternal extends CollocationPromptRecord {
  germanText: string;
  clozeAnswer: string;
}

const toPromptInternal = (entity: CollocationPrompt): CollocationPromptInternal => ({
  ...toPromptRecord(entity),
  germanText: entity.germanText,
  clozeAnswer: entity.clozeAnswer
});

const toAttemptRecord = (entity: CollocationAttempt): CollocationAttemptRecord => ({
  id: Number(entity.id),
  promptId: Number(entity.promptId),
  germanText: entity.germanText,
  englishText: entity.englishText,
  clozeSentence: entity.clozeSentence,
  userAnswerText: entity.userAnswerText,
  score: entity.score,
  feedback: entity.feedback,
  correctVersion: entity.correctVersion,
  alternatives: entity.alternatives,
  attemptHistory: [],
  createdAt: entity.createdAt.toISOString()
});

export const collocationRepository = {
  async createPrompt(input: {
    userId?: number | null;
    germanText: string;
    englishText: string;
    clozeSentence: string;
    clozeAnswer: string;
    collocationType: string;
    generationCategory: string;
  }): Promise<CollocationPromptRecord> {
    const repo = appDataSource.getRepository(CollocationPrompt);
    const normalizedGermanText = normalizeCollocationText(input.germanText);
    await repo
      .createQueryBuilder()
      .insert()
      .into(CollocationPrompt)
      .values({
        userId: input.userId != null ? String(input.userId) : null,
        germanText: input.germanText.trim(),
        normalizedGermanText,
        englishText: input.englishText.trim(),
        clozeSentence: input.clozeSentence.trim(),
        clozeAnswer: input.clozeAnswer.trim(),
        collocationType: input.collocationType,
        generationCategory: input.generationCategory
      })
      .orIgnore()
      .execute();

    const existing = await repo.findOneByOrFail({
      normalizedGermanText,
      generationCategory: input.generationCategory
    });
    return toPromptRecord(existing);
  },

  async findPromptInternalById(input: { promptId: number }): Promise<CollocationPromptInternal | null> {
    const repo = appDataSource.getRepository(CollocationPrompt);
    const row = await repo.findOne({ where: { id: String(input.promptId) } });
    return row ? toPromptInternal(row) : null;
  },

  async listUnseenPromptsByCategory(input: {
    userId: number;
    category: string;
    limit: number;
  }): Promise<CollocationPromptRecord[]> {
    const repo = appDataSource.getRepository(CollocationPrompt);
    const rows = await repo
      .createQueryBuilder("prompt")
      .leftJoin(
        CollocationPromptView,
        "viewed",
        "viewed.promptId = prompt.id AND viewed.userId = :userId",
        { userId: String(input.userId) }
      )
      .where("prompt.generationCategory = :category", { category: input.category })
      .andWhere("viewed.id IS NULL")
      .orderBy("prompt.createdAt", "ASC")
      .take(input.limit)
      .getMany();
    return rows.map(toPromptRecord);
  },

  async findLeastRecentlyViewedPrompt(input: {
    userId: number;
    category: string;
  }): Promise<CollocationPromptRecord | null> {
    const repo = appDataSource.getRepository(CollocationPrompt);
    const row = await repo
      .createQueryBuilder("prompt")
      .innerJoin(
        CollocationPromptView,
        "viewed",
        "viewed.promptId = prompt.id AND viewed.userId = :userId",
        { userId: String(input.userId) }
      )
      .where("prompt.generationCategory = :category", { category: input.category })
      .orderBy("viewed.createdAt", "ASC")
      .addOrderBy("prompt.id", "ASC")
      .getOne();
    return row ? toPromptRecord(row) : null;
  },

  async listRecentPromptTextsByCategory(input: { category: string; limit: number }): Promise<string[]> {
    const repo = appDataSource.getRepository(CollocationPrompt);
    const rows = await repo
      .createQueryBuilder("prompt")
      .select(["prompt.germanText"])
      .where("prompt.generationCategory = :category", { category: input.category })
      .orderBy("prompt.createdAt", "DESC")
      .take(input.limit)
      .getMany();
    return rows.map((row) => row.germanText).filter((text) => text.trim().length > 0);
  },

  async markPromptViewed(input: { userId: number; promptId: number }): Promise<void> {
    const repo = appDataSource.getRepository(CollocationPromptView);
    await repo
      .createQueryBuilder()
      .insert()
      .into(CollocationPromptView)
      .values({
        userId: String(input.userId),
        promptId: String(input.promptId),
        createdAt: new Date()
      })
      .orUpdate(["created_at"], ["user_id", "prompt_id"])
      .execute();
  },

  async hasUserViewedPrompt(input: { userId: number; promptId: number }): Promise<boolean> {
    const repo = appDataSource.getRepository(CollocationPromptView);
    const count = await repo.count({
      where: { userId: String(input.userId), promptId: String(input.promptId) }
    });
    return count > 0;
  },

  async createAttempt(input: {
    userId: number;
    promptId: number;
    germanText: string;
    englishText: string;
    clozeSentence: string;
    userAnswerText: string;
    score: number;
    feedback: string;
    correctVersion: string;
    alternatives: string[];
  }): Promise<CollocationAttemptRecord> {
    const repo = appDataSource.getRepository(CollocationAttempt);
    const created = repo.create({
      userId: String(input.userId),
      promptId: String(input.promptId),
      germanText: input.germanText,
      englishText: input.englishText,
      clozeSentence: input.clozeSentence,
      userAnswerText: input.userAnswerText,
      score: input.score,
      feedback: input.feedback,
      correctVersion: input.correctVersion,
      alternatives: input.alternatives
    });
    const saved = await repo.save(created);
    return toAttemptRecord(saved);
  },

  async listAttempts(input: { userId: number; limit: number; offset: number }): Promise<CollocationAttemptRecord[]> {
    const repo = appDataSource.getRepository(CollocationAttempt);
    const rows = await repo.find({
      where: { userId: String(input.userId) },
      order: { createdAt: "DESC" },
      take: input.limit,
      skip: input.offset
    });
    return rows.map(toAttemptRecord);
  },

  async countAttempts(input: { userId: number }): Promise<number> {
    const repo = appDataSource.getRepository(CollocationAttempt);
    return repo.count({ where: { userId: String(input.userId) } });
  },

  async listAttemptHistoryByGermanTexts(input: {
    userId: number;
    germanTexts: string[];
  }): Promise<Record<string, CollocationAttemptHistoryPoint[]>> {
    if (input.germanTexts.length === 0) {
      return {};
    }

    const repo = appDataSource.getRepository(CollocationAttempt);
    const uniqueTexts = [...new Set(input.germanTexts.map((text) => text.trim()).filter(Boolean))];
    if (uniqueTexts.length === 0) {
      return {};
    }

    const rows = await repo
      .createQueryBuilder("attempt")
      .where("attempt.userId = :userId", { userId: String(input.userId) })
      .andWhere("attempt.germanText IN (:...germanTexts)", { germanTexts: uniqueTexts })
      .orderBy("attempt.createdAt", "ASC")
      .addOrderBy("attempt.id", "ASC")
      .getMany();

    const grouped: Record<string, CollocationAttemptHistoryPoint[]> = {};
    for (const row of rows) {
      const key = row.germanText;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push({
        id: Number(row.id),
        userAnswerText: row.userAnswerText,
        score: row.score,
        createdAt: row.createdAt.toISOString()
      });
    }
    return grouped;
  }
};
