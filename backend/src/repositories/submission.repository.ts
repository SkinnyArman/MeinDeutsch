import { appDataSource } from "../db/pool.js";
import { calculateMasteryDelta } from "../logic/mastery.logic.js";
import { AnswerLog, type AnswerLogRecord } from "../models/answer-log.model.js";
import { MistakeStat } from "../models/mistake-stat.model.js";
import type { AnalysisResult, MistakeType, SubmissionInput } from "../types/submission.types.js";

const toAnswerLogRecord = (entity: AnswerLog): AnswerLogRecord => ({
  id: Number(entity.id),
  prompt: entity.prompt,
  answerText: entity.answerText,
  correctedText: entity.correctedText,
  nativeRewrite: entity.nativeRewrite,
  errorTypes: entity.errorTypes,
  metrics: entity.metrics,
  tips: entity.tips,
  createdAt: entity.createdAt.toISOString()
});

export const submissionRepository = {
  async insertAnswerLog(input: SubmissionInput, analysis: AnalysisResult): Promise<AnswerLogRecord> {
    const repo = appDataSource.getRepository(AnswerLog);

    const created = repo.create({
      prompt: input.prompt,
      answerText: input.answerText,
      correctedText: analysis.correctedText,
      nativeRewrite: analysis.nativeRewrite,
      errorTypes: analysis.errors,
      metrics: analysis.metrics,
      tips: analysis.tips
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
        const masteryDelta = calculateMasteryDelta(analysis.errors, mistakeType);

        if (!existing) {
          const created = repo.create({
            mistakeType,
            frequency: data.count,
            severityScore: avgSeverity,
            masteryScore: Math.max(0, Math.min(100, 100 + masteryDelta))
          });

          await repo.save(created);
          continue;
        }

        const nextFrequency = existing.frequency + data.count;
        const weightedSeverity =
          (existing.severityScore * existing.frequency + avgSeverity * data.count) / Math.max(1, nextFrequency);

        existing.frequency = nextFrequency;
        existing.severityScore = weightedSeverity;
        existing.masteryScore = Math.max(0, Math.min(100, existing.masteryScore + masteryDelta));
        await repo.save(existing);
      }
    });
  }
};
