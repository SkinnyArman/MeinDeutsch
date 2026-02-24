import { appDataSource } from "../db/pool.js";
import { AnswerLog, type AnswerLogRecord } from "../models/answer-log.model.js";
import { Question } from "../models/question.model.js";
import { Topic } from "../models/topic.model.js";
import { MistakeStat } from "../models/mistake-stat.model.js";
import type { AnalysisResult, AssessmentContext, MistakeType } from "../types/submission.types.js";

interface PersistedSubmission {
  userId: number;
  questionId?: number;
  questionText: string;
  answerText: string;
  modelUsed: string;
}

const toAnswerLogRecord = (entity: AnswerLog): AnswerLogRecord => ({
  id: Number(entity.id),
  questionId: entity.questionId ? Number(entity.questionId) : null,
  questionText: entity.questionText,
  answerText: entity.answerText,
  correctedText: entity.correctedText,
  cefrLevel: entity.cefrLevel,
  errorTypes: entity.errorTypes,
  tips: entity.tips,
  contextualWordSuggestions: entity.contextualWordSuggestions,
  modelUsed: entity.modelUsed,
  createdAt: entity.createdAt.toISOString()
});

const toAnswerLogRecordWithTopic = (row: {
  answerLog: AnswerLog;
  topicId: string | null;
  topicName: string | null;
}): AnswerLogRecord => ({
  id: Number(row.answerLog.id),
  questionId: row.answerLog.questionId ? Number(row.answerLog.questionId) : null,
  topicId: row.topicId ? Number(row.topicId) : null,
  topicName: row.topicName ?? undefined,
  questionText: row.answerLog.questionText,
  answerText: row.answerLog.answerText,
  correctedText: row.answerLog.correctedText,
  cefrLevel: row.answerLog.cefrLevel,
  errorTypes: row.answerLog.errorTypes,
  tips: row.answerLog.tips,
  contextualWordSuggestions: row.answerLog.contextualWordSuggestions,
  modelUsed: row.answerLog.modelUsed,
  createdAt: row.answerLog.createdAt.toISOString()
});

export const submissionRepository = {
  async insertAnswerLog(input: PersistedSubmission, analysis: AnalysisResult): Promise<AnswerLogRecord> {
    const repo = appDataSource.getRepository(AnswerLog);

    const created = repo.create({
      userId: String(input.userId),
      questionId: input.questionId ? String(input.questionId) : null,
      questionText: input.questionText,
      answerText: input.answerText,
      correctedText: analysis.correctedText,
      cefrLevel: analysis.cefrLevel,
      errorTypes: analysis.errors,
      tips: analysis.tips,
      contextualWordSuggestions: analysis.contextualWordSuggestions,
      modelUsed: input.modelUsed
    });

    const saved = await repo.save(created);
    return toAnswerLogRecord(saved);
  },

  async upsertMistakeStats(userId: number, analysis: AnalysisResult): Promise<void> {
    const grouped = analysis.errors.reduce<Record<MistakeType, { count: number; totalSeverity: number }>>(
      (acc, err) => {
        if (!acc[err.type]) {
          acc[err.type] = { count: 0, totalSeverity: 0 };
        }

        acc[err.type].count += 1;
        acc[err.type].totalSeverity += err.severity;
        return acc;
      },
      {} as Record<MistakeType, { count: number; totalSeverity: number }>
    );

    await appDataSource.transaction(async (manager) => {
      const repo = manager.getRepository(MistakeStat);

      for (const [mistakeType, data] of Object.entries(grouped) as [MistakeType, { count: number; totalSeverity: number }][]) {
        const avgSeverity = data.totalSeverity / data.count;
        const existing = await repo.findOne({ where: { userId: String(userId), mistakeType } });

        if (!existing) {
          const created = repo.create({
            userId: String(userId),
            mistakeType,
            frequency: data.count,
            severityScore: avgSeverity
          });

          await repo.save(created);
          continue;
        }

        const nextFrequency = existing.frequency + data.count;
        const weightedSeverity =
          (existing.severityScore * existing.frequency + avgSeverity * data.count) / Math.max(1, nextFrequency);

        existing.frequency = nextFrequency;
        existing.severityScore = weightedSeverity;
        await repo.save(existing);
      }
    });
  },

  async getAssessmentContext(userId: number): Promise<AssessmentContext> {
    const mistakeRepo = appDataSource.getRepository(MistakeStat);
    const answerLogRepo = appDataSource.getRepository(AnswerLog);

    const topMistakes = await mistakeRepo.find({
      where: { userId: String(userId) },
      order: { frequency: "DESC", severityScore: "DESC" },
      take: 8
    });

    const recentLogs = await answerLogRepo.find({
      where: { userId: String(userId) },
      order: { createdAt: "DESC" },
      take: 12,
      select: {
        questionText: true,
        answerText: true,
        correctedText: true,
        cefrLevel: true,
        tips: true
      }
    });

    const recentTips = recentLogs
      .flatMap((log) => log.tips)
      .filter((tip, idx, arr) => arr.indexOf(tip) === idx)
      .slice(0, 12);

    return {
      topMistakes: topMistakes.map((item) => ({
        type: item.mistakeType,
        frequency: item.frequency,
        severityScore: item.severityScore
      })),
      recentTips,
      recentQAs: recentLogs.slice(0, 6).map((log) => ({
        questionText: log.questionText,
        answerText: log.answerText,
        correctedText: log.correctedText,
        cefrLevel: log.cefrLevel,
        tips: log.tips
      }))
    };
  }
  ,

  async listAnswerLogs(input: { userId: number; limit: number; offset: number }): Promise<AnswerLogRecord[]> {
    const repo = appDataSource.getRepository(AnswerLog);
    const rows = await repo
      .createQueryBuilder("answerLog")
      .leftJoin(Question, "question", "question.id = answerLog.question_id")
      .leftJoin(Topic, "topic", "topic.id = question.topic_id")
      .where("answerLog.user_id = :userId", { userId: String(input.userId) })
      .orderBy("answerLog.created_at", "DESC")
      .limit(input.limit)
      .offset(input.offset)
      .select([
        "answerLog",
        "question.id",
        "topic.id",
        "topic.name"
      ])
      .getRawAndEntities();

    return rows.entities.map((entity, idx) =>
      toAnswerLogRecordWithTopic({
        answerLog: entity,
        topicId: rows.raw[idx]?.topic_id ?? null,
        topicName: rows.raw[idx]?.topic_name ?? null
      })
    );
  },

  async findAnswerLogById(id: number, userId: number): Promise<AnswerLogRecord | null> {
    const repo = appDataSource.getRepository(AnswerLog);
    const rows = await repo
      .createQueryBuilder("answerLog")
      .leftJoin(Question, "question", "question.id = answerLog.question_id")
      .leftJoin(Topic, "topic", "topic.id = question.topic_id")
      .where("answerLog.id = :id", { id: String(id) })
      .andWhere("answerLog.user_id = :userId", { userId: String(userId) })
      .select(["answerLog", "question.id", "topic.id", "topic.name"])
      .getRawAndEntities();

    if (!rows.entities.length) {
      return null;
    }

    return toAnswerLogRecordWithTopic({
      answerLog: rows.entities[0],
      topicId: rows.raw[0]?.topic_id ?? null,
      topicName: rows.raw[0]?.topic_name ?? null
    });
  }
};
