import { MoreThanOrEqual } from "typeorm";
import { appDataSource } from "../db/pool.js";
import { AnswerLog } from "../models/answer-log.model.js";
import { CollocationAttempt } from "../models/collocation-attempt.model.js";
import { ExpressionAttempt } from "../models/expression-attempt.model.js";
import { VocabularyItem } from "../models/vocabulary-item.model.js";
import { VocabularyReviewLog } from "../models/vocabulary-review-log.model.js";
import type { DashboardActivityDay, DashboardScorePoint } from "../contracts/api-types.js";

export interface SectionCountsToday {
  dailyTalk: number;
  alltagssprache: number;
  kollokationen: number;
  vocabulary: number;
}

const countSince = async (
  entity: typeof AnswerLog | typeof ExpressionAttempt | typeof CollocationAttempt,
  userId: number,
  since: Date
): Promise<number> => {
  return appDataSource.getRepository(entity).count({
    where: { userId: String(userId), createdAt: MoreThanOrEqual(since) }
  });
};

export const dashboardRepository = {
  async getSectionCountsSince(userId: number, since: Date): Promise<SectionCountsToday> {
    const [dailyTalk, alltagssprache, kollokationen, vocabulary] = await Promise.all([
      countSince(AnswerLog, userId, since),
      countSince(ExpressionAttempt, userId, since),
      countSince(CollocationAttempt, userId, since),
      appDataSource.getRepository(VocabularyReviewLog).count({
        where: { userId: String(userId), reviewedAt: MoreThanOrEqual(since) }
      })
    ]);

    return { dailyTalk, alltagssprache, kollokationen, vocabulary };
  },

  async getActivitySeries(userId: number, days: number, now: Date): Promise<DashboardActivityDay[]> {
    const todayStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    const since = new Date(todayStart.getTime() - (days - 1) * 24 * 60 * 60 * 1000);

    const grouped = async (table: string, dateColumn: string): Promise<Map<string, number>> => {
      const rows: Array<{ day: string; count: string }> = await appDataSource.query(
        `SELECT to_char(${dateColumn} AT TIME ZONE 'UTC', 'YYYY-MM-DD') AS day, count(*) AS count
         FROM ${table}
         WHERE user_id = $1 AND ${dateColumn} >= $2
         GROUP BY 1`,
        [String(userId), since.toISOString()]
      );
      return new Map(rows.map((row) => [row.day, Number(row.count)]));
    };

    const [talk, alltag, kollok, vocab] = await Promise.all([
      grouped("answer_logs", "created_at"),
      grouped("expression_attempts", "created_at"),
      grouped("collocation_attempts", "created_at"),
      grouped("vocabulary_review_logs", "reviewed_at")
    ]);

    const series: DashboardActivityDay[] = [];
    for (let i = 0; i < days; i += 1) {
      const day = new Date(since.getTime() + i * 24 * 60 * 60 * 1000);
      const key = day.toISOString().slice(0, 10);
      series.push({
        date: key,
        dailyTalk: talk.get(key) ?? 0,
        alltagssprache: alltag.get(key) ?? 0,
        kollokationen: kollok.get(key) ?? 0,
        vocabulary: vocab.get(key) ?? 0
      });
    }
    return series;
  },

  async getTotals(userId: number): Promise<{
    dailyTalks: number;
    expressionAttempts: number;
    collocationAttempts: number;
    vocabularyWords: number;
    vocabularyReviews: number;
  }> {
    const [dailyTalks, expressionAttempts, collocationAttempts, vocabularyWords, vocabularyReviews] =
      await Promise.all([
        appDataSource.getRepository(AnswerLog).count({ where: { userId: String(userId) } }),
        appDataSource.getRepository(ExpressionAttempt).count({ where: { userId: String(userId) } }),
        appDataSource.getRepository(CollocationAttempt).count({ where: { userId: String(userId) } }),
        appDataSource.getRepository(VocabularyItem).count({ where: { userId: String(userId) } }),
        appDataSource.getRepository(VocabularyReviewLog).count({ where: { userId: String(userId) } })
      ]);

    return { dailyTalks, expressionAttempts, collocationAttempts, vocabularyWords, vocabularyReviews };
  },

  async getScoreTrends(userId: number, limit: number): Promise<{
    alltag: DashboardScorePoint[];
    kollok: DashboardScorePoint[];
  }> {
    const [alltagRows, kollokRows] = await Promise.all([
      appDataSource.getRepository(ExpressionAttempt).find({
        where: { userId: String(userId) },
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

    return {
      alltag: alltagRows
        .reverse()
        .map((row) => ({ score: row.naturalnessScore, at: row.createdAt.toISOString() })),
      kollok: kollokRows
        .reverse()
        .map((row) => ({ score: row.score, at: row.createdAt.toISOString() }))
    };
  },

  async getLatestCefrLevel(userId: number): Promise<string | null> {
    const row = await appDataSource.getRepository(AnswerLog).findOne({
      where: { userId: String(userId) },
      order: { createdAt: "DESC" },
      select: { cefrLevel: true, createdAt: true }
    });
    return row?.cefrLevel ?? null;
  }
};
