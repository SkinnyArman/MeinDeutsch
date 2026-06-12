import { appDataSource } from "../db/pool.js";
import {
  ExpressionAttempt,
  type ExpressionAttemptHistoryPoint,
  type ExpressionAttemptRecord
} from "../models/expression-attempt.model.js";
import { ExpressionPrompt, type ExpressionPromptRecord } from "../models/expression-prompt.model.js";
import { ExpressionPromptView } from "../models/expression-prompt-view.model.js";

export const normalizeExpressionPromptText = (text: string): string =>
  text.trim().toLowerCase().replace(/\s+/g, " ");

const toPromptRecord = (entity: ExpressionPrompt): ExpressionPromptRecord => ({
  id: Number(entity.id),
  englishText: entity.englishText,
  situationText: entity.situationText ?? null,
  generatedContext: entity.generatedContext,
  generationCategory: entity.generationCategory,
  createdAt: entity.createdAt.toISOString()
});

const toAttemptRecord = (entity: ExpressionAttempt): ExpressionAttemptRecord => ({
  id: Number(entity.id),
  promptId: Number(entity.promptId),
  englishText: entity.englishText,
  userAnswerText: entity.userAnswerText,
  naturalnessScore: entity.naturalnessScore,
  feedback: entity.feedback,
  nativeLikeVersion: entity.nativeLikeVersion,
  alternatives: entity.alternatives,
  attemptHistory: [],
  createdAt: entity.createdAt.toISOString()
});

export const expressionRepository = {
  async findPromptByTextAndCategory(input: { englishText: string; generationCategory: string }): Promise<ExpressionPromptRecord | null> {
    const repo = appDataSource.getRepository(ExpressionPrompt);
    const row = await repo.findOne({
      where: {
        normalizedEnglishText: normalizeExpressionPromptText(input.englishText),
        generationCategory: input.generationCategory
      }
    });
    return row ? toPromptRecord(row) : null;
  },

  async createPrompt(input: {
    userId?: number | null;
    englishText: string;
    situationText?: string | null;
    nativeAnswer?: string | null;
    distractors?: string[];
    generatedContext?: string | null;
    generationCategory: string;
  }): Promise<ExpressionPromptRecord> {
    const repo = appDataSource.getRepository(ExpressionPrompt);
    const normalizedEnglishText = normalizeExpressionPromptText(input.englishText);
    await repo
      .createQueryBuilder()
      .insert()
      .into(ExpressionPrompt)
      .values({
        userId: input.userId != null ? String(input.userId) : null,
        englishText: input.englishText.trim(),
        normalizedEnglishText,
        situationText: input.situationText ?? null,
        nativeAnswer: input.nativeAnswer ?? null,
        distractors: input.distractors ?? [],
        generatedContext: input.generatedContext ?? null,
        generationCategory: input.generationCategory
      })
      .orIgnore()
      .returning("*")
      .execute();

    const existing = await repo.findOneByOrFail({
      normalizedEnglishText,
      generationCategory: input.generationCategory
    });
    return toPromptRecord(existing);
  },

  async findPromptById(input: { promptId: number }): Promise<ExpressionPromptRecord | null> {
    const repo = appDataSource.getRepository(ExpressionPrompt);
    const row = await repo.findOne({
      where: {
        id: String(input.promptId)
      }
    });
    return row ? toPromptRecord(row) : null;
  },

  // Server-only: includes the gold answer + distractors (never sent in the served record).
  async findPromptAnswerById(input: { promptId: number }): Promise<{ nativeAnswer: string | null; distractors: string[] } | null> {
    const repo = appDataSource.getRepository(ExpressionPrompt);
    const row = await repo.findOne({ where: { id: String(input.promptId) } });
    if (!row) {
      return null;
    }
    return { nativeAnswer: row.nativeAnswer ?? null, distractors: Array.isArray(row.distractors) ? row.distractors : [] };
  },

  async listUnseenPromptsByCategory(input: {
    userId: number;
    category: string;
    limit: number;
  }): Promise<ExpressionPromptRecord[]> {
    const repo = appDataSource.getRepository(ExpressionPrompt);
    try {
      const rows = await repo
        .createQueryBuilder("prompt")
        .leftJoin(
          ExpressionPromptView,
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
    } catch {
      // Compatibility fallback for legacy schemas before generation_category exists.
      const rows = await repo
        .createQueryBuilder("prompt")
        .leftJoin(
          ExpressionPromptView,
          "viewed",
          "viewed.promptId = prompt.id AND viewed.userId = :userId",
          { userId: String(input.userId) }
        )
        .where("viewed.id IS NULL")
        .orderBy("prompt.createdAt", "ASC")
        .take(input.limit)
        .getMany();
      return rows.map(toPromptRecord);
    }
  },

  async listPromptsByCategory(input: {
    category: string;
    limit: number;
  }): Promise<ExpressionPromptRecord[]> {
    const repo = appDataSource.getRepository(ExpressionPrompt);
    try {
      const rows = await repo
        .createQueryBuilder("prompt")
        .where("prompt.generationCategory = :category", { category: input.category })
        .orderBy("prompt.createdAt", "ASC")
        .take(input.limit)
        .getMany();
      return rows.map(toPromptRecord);
    } catch {
      const rows = await repo
        .createQueryBuilder("prompt")
        .orderBy("prompt.createdAt", "ASC")
        .take(input.limit)
        .getMany();
      return rows.map(toPromptRecord);
    }
  },

  async findLeastRecentlyViewedPrompt(input: {
    userId: number;
    category: string;
  }): Promise<ExpressionPromptRecord | null> {
    const repo = appDataSource.getRepository(ExpressionPrompt);
    const row = await repo
      .createQueryBuilder("prompt")
      .innerJoin(
        ExpressionPromptView,
        "viewed",
        "viewed.promptId = prompt.id AND viewed.userId = :userId",
        { userId: String(input.userId) }
      )
      .where("prompt.generationCategory = :category", { category: input.category })
      // Prefer recycling situational prompts over legacy ones with no situation.
      .orderBy("(prompt.situation_text IS NULL)", "ASC")
      .addOrderBy("viewed.createdAt", "ASC")
      .addOrderBy("prompt.id", "ASC")
      .getOne();
    return row ? toPromptRecord(row) : null;
  },

  async listRecentPromptTextsByCategory(input: {
    category: string;
    limit: number;
  }): Promise<string[]> {
    const repo = appDataSource.getRepository(ExpressionPrompt);
    try {
      const rows = await repo
        .createQueryBuilder("prompt")
        .select(["prompt.englishText"])
        .where("prompt.generationCategory = :category", { category: input.category })
        .orderBy("prompt.createdAt", "DESC")
        .take(input.limit)
        .getMany();
      return rows.map((row) => row.englishText).filter((text) => text.trim().length > 0);
    } catch {
      const rows = await repo
        .createQueryBuilder("prompt")
        .select(["prompt.englishText"])
        .orderBy("prompt.createdAt", "DESC")
        .take(input.limit)
        .getMany();
      return rows.map((row) => row.englishText).filter((text) => text.trim().length > 0);
    }
  },

  async markPromptViewed(input: { userId: number; promptId: number }): Promise<void> {
    const repo = appDataSource.getRepository(ExpressionPromptView);
    await repo
      .createQueryBuilder()
      .insert()
      .into(ExpressionPromptView)
      .values({
        userId: String(input.userId),
        promptId: String(input.promptId),
        createdAt: new Date()
      })
      .orUpdate(["created_at"], ["user_id", "prompt_id"])
      .execute();
  },

  async hasUserViewedPrompt(input: { userId: number; promptId: number }): Promise<boolean> {
    const repo = appDataSource.getRepository(ExpressionPromptView);
    const count = await repo.count({
      where: {
        userId: String(input.userId),
        promptId: String(input.promptId)
      }
    });
    return count > 0;
  },

  // Recognition→production phase state (one row per user+prompt).
  async findDueProductionPrompt(input: {
    userId: number;
    category: string;
    now: Date;
  }): Promise<ExpressionPromptRecord | null> {
    const repo = appDataSource.getRepository(ExpressionPrompt);
    const row = await repo
      .createQueryBuilder("prompt")
      .innerJoin(
        ExpressionPromptView,
        "viewed",
        "viewed.promptId = prompt.id AND viewed.userId = :userId",
        { userId: String(input.userId) }
      )
      .where("prompt.generationCategory = :category", { category: input.category })
      .andWhere("viewed.recognition_done_at IS NOT NULL")
      .andWhere("viewed.production_done_at IS NULL")
      .andWhere("viewed.production_due_at IS NOT NULL")
      .andWhere("viewed.production_due_at <= :now", { now: input.now.toISOString() })
      .orderBy("viewed.production_due_at", "ASC")
      .getOne();
    return row ? toPromptRecord(row) : null;
  },

  async markRecognitionServed(input: { userId: number; promptId: number }): Promise<void> {
    const repo = appDataSource.getRepository(ExpressionPromptView);
    await repo
      .createQueryBuilder()
      .insert()
      .into(ExpressionPromptView)
      .values({
        userId: String(input.userId),
        promptId: String(input.promptId),
        createdAt: new Date()
      })
      .orIgnore()
      .execute();
  },

  async markRecognitionDone(input: { userId: number; promptId: number; productionDueAt: Date }): Promise<void> {
    const repo = appDataSource.getRepository(ExpressionPromptView);
    await repo.update(
      { userId: String(input.userId), promptId: String(input.promptId) },
      { recognitionDoneAt: new Date(), productionDueAt: input.productionDueAt }
    );
  },

  async markProductionDone(input: { userId: number; promptId: number }): Promise<void> {
    const repo = appDataSource.getRepository(ExpressionPromptView);
    await repo.update(
      { userId: String(input.userId), promptId: String(input.promptId) },
      { productionDoneAt: new Date() }
    );
  },

  async createAttempt(input: {
    userId: number;
    promptId: number;
    englishText: string;
    userAnswerText: string;
    naturalnessScore: number;
    feedback: string;
    nativeLikeVersion: string;
    alternatives: string[];
    phase?: "recognition" | "production";
  }): Promise<ExpressionAttemptRecord> {
    const repo = appDataSource.getRepository(ExpressionAttempt);
    const created = repo.create({
      userId: String(input.userId),
      promptId: String(input.promptId),
      englishText: input.englishText,
      userAnswerText: input.userAnswerText,
      naturalnessScore: input.naturalnessScore,
      feedback: input.feedback,
      nativeLikeVersion: input.nativeLikeVersion,
      alternatives: input.alternatives,
      phase: input.phase ?? "production"
    });
    const saved = await repo.save(created);
    return toAttemptRecord(saved);
  },

  async listAttempts(input: { userId: number; limit: number; offset: number }): Promise<ExpressionAttemptRecord[]> {
    const repo = appDataSource.getRepository(ExpressionAttempt);
    const rows = await repo.find({
      where: { userId: String(input.userId), phase: "production" },
      order: { createdAt: "DESC" },
      take: input.limit,
      skip: input.offset
    });
    return rows.map(toAttemptRecord);
  },

  async countAttempts(input: { userId: number }): Promise<number> {
    const repo = appDataSource.getRepository(ExpressionAttempt);
    return repo.count({
      where: { userId: String(input.userId), phase: "production" }
    });
  },

  async listAttemptHistoryByEnglishTexts(input: {
    userId: number;
    englishTexts: string[];
  }): Promise<Record<string, ExpressionAttemptHistoryPoint[]>> {
    if (input.englishTexts.length === 0) {
      return {};
    }

    const repo = appDataSource.getRepository(ExpressionAttempt);
    const uniqueTexts = [...new Set(input.englishTexts.map((text) => text.trim()).filter(Boolean))];
    if (uniqueTexts.length === 0) {
      return {};
    }

    const rows = await repo
      .createQueryBuilder("attempt")
      .where("attempt.userId = :userId", { userId: String(input.userId) })
      .andWhere("attempt.phase = 'production'")
      .andWhere("attempt.englishText IN (:...englishTexts)", { englishTexts: uniqueTexts })
      .orderBy("attempt.createdAt", "ASC")
      .addOrderBy("attempt.id", "ASC")
      .getMany();

    const grouped: Record<string, ExpressionAttemptHistoryPoint[]> = {};
    for (const row of rows) {
      const key = row.englishText;
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push({
        id: Number(row.id),
        userAnswerText: row.userAnswerText,
        naturalnessScore: row.naturalnessScore,
        createdAt: row.createdAt.toISOString()
      });
    }
    return grouped;
  }
};
