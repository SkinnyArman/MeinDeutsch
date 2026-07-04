import { appDataSource } from "../db/pool.js";
import { AnswerLog } from "../models/answer-log.model.js";
import { CollocationAttempt } from "../models/collocation-attempt.model.js";
import { ExpressionAttempt } from "../models/expression-attempt.model.js";

export const progressRepository = {
  // CEFR levels the AI assigned to the learner's recent writing answers.
  async recentAnswerLevels(userId: number, limit: number): Promise<string[]> {
    const rows = await appDataSource.getRepository(AnswerLog).find({
      where: { userId: String(userId) },
      order: { createdAt: "DESC" },
      take: limit,
      select: { cefrLevel: true, createdAt: true }
    });
    return rows.map((r) => r.cefrLevel).filter(Boolean);
  },

  // Recent Alltag (production) + Kollok scores, newest first, merged.
  async recentScores(userId: number, limit: number): Promise<number[]> {
    const [expr, kollok] = await Promise.all([
      appDataSource.getRepository(ExpressionAttempt).find({
        where: { userId: String(userId), phase: "production" },
        order: { createdAt: "DESC" },
        take: limit,
        select: { naturalnessScore: true, createdAt: true }
      }),
      appDataSource.getRepository(CollocationAttempt).find({
        where: { userId: String(userId) },
        order: { createdAt: "DESC" },
        take: limit,
        select: { score: true, createdAt: true }
      })
    ]);

    const merged = [
      ...expr.map((r) => ({ score: r.naturalnessScore, at: r.createdAt.getTime() })),
      ...kollok.map((r) => ({ score: r.score, at: r.createdAt.getTime() }))
    ]
      .sort((a, b) => b.at - a.at)
      .slice(0, limit);

    return merged.map((m) => m.score);
  }
};
