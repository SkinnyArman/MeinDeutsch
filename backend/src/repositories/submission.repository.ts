import { appDataSource } from "../db/pool.js";
import { AnswerLog, type AnswerLogRecord } from "../models/answer-log.model.js";
import { MistakeStat } from "../models/mistake-stat.model.js";
import type { AnalysisResult, AssessmentContext, MistakeType } from "../types/submission.types.js";

interface PersistedSubmission {
  questionId?: number;
  questionText: string;
  answerText: string;
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
  createdAt: entity.createdAt.toISOString()
});

export const submissionRepository = {
  async insertAnswerLog(input: PersistedSubmission, analysis: AnalysisResult): Promise<AnswerLogRecord> {
    const repo = appDataSource.getRepository(AnswerLog);

    const created = repo.create({
      questionId: input.questionId ? String(input.questionId) : null,
      questionText: input.questionText,
      answerText: input.answerText,
      correctedText: analysis.correctedText,
      cefrLevel: analysis.cefrLevel,
      errorTypes: analysis.errors,
      tips: analysis.tips,
      contextualWordSuggestions: analysis.contextualWordSuggestions
    });

    const saved = await repo.save(created);
    return toAnswerLogRecord(saved);
  },

  async upsertMistakeStats(analysis: AnalysisResult): Promise<void> {
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
        const existing = await repo.findOne({ where: { mistakeType } });

        if (!existing) {
          const created = repo.create({
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

  async getAssessmentContext(): Promise<AssessmentContext> {
    const mistakeRepo = appDataSource.getRepository(MistakeStat);
    const answerLogRepo = appDataSource.getRepository(AnswerLog);

    const topMistakes = await mistakeRepo.find({
      order: { frequency: "DESC", severityScore: "DESC" },
      take: 8
    });

    const recentLogs = await answerLogRepo.find({
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
};
