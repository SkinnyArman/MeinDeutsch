import { appDataSource } from "../db/pool.js";
import { type DailyTalkStreakRecord, StreakStatus } from "../models/streak-status.model.js";

const FEATURE_KEY = "daily_talk";
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfUtcDay = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const formatDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const toRecord = (entity: StreakStatus, now: Date): DailyTalkStreakRecord => ({
  featureKey: "daily_talk",
  currentStreak: entity.currentStreak,
  longestStreak: entity.longestStreak,
  hasCompletedToday: entity.lastCompletionDate === formatDateOnly(now),
  lastCompletionDate: entity.lastCompletionDate,
  windowStartAt: entity.windowStartAt.toISOString(),
  windowEndAt: entity.windowEndAt.toISOString(),
  remainingMs: Math.max(0, entity.windowEndAt.getTime() - now.getTime())
});

const ensureRow = async (now: Date): Promise<StreakStatus> => {
  const repo = appDataSource.getRepository(StreakStatus);
  const existing = await repo.findOne({ where: { featureKey: FEATURE_KEY } });
  if (existing) {
    return existing;
  }

  const dayStart = startOfUtcDay(now);
  const created = repo.create({
    featureKey: FEATURE_KEY,
    currentStreak: 0,
    longestStreak: 0,
    lastCompletionDate: null,
    windowStartAt: dayStart,
    windowEndAt: new Date(dayStart.getTime() + DAY_MS)
  });

  return repo.save(created);
};

export const streakRepository = {
  async getDailyTalkStatus(now: Date): Promise<DailyTalkStreakRecord> {
    const row = await ensureRow(now);

    const todayStart = startOfUtcDay(now);
    const todayEnd = new Date(todayStart.getTime() + DAY_MS);

    if (row.windowStartAt.getTime() !== todayStart.getTime() || row.windowEndAt.getTime() !== todayEnd.getTime()) {
      row.windowStartAt = todayStart;
      row.windowEndAt = todayEnd;
      await appDataSource.getRepository(StreakStatus).save(row);
    }

    return toRecord(row, now);
  },

  async recordDailyTalkCompletion(now: Date): Promise<DailyTalkStreakRecord> {
    const repo = appDataSource.getRepository(StreakStatus);
    const row = await ensureRow(now);

    const today = formatDateOnly(now);
    if (row.lastCompletionDate === today) {
      return toRecord(row, now);
    }

    const todayStart = startOfUtcDay(now);
    const yesterday = formatDateOnly(new Date(todayStart.getTime() - DAY_MS));

    row.currentStreak = row.lastCompletionDate === yesterday ? row.currentStreak + 1 : 1;
    row.longestStreak = Math.max(row.longestStreak, row.currentStreak);
    row.lastCompletionDate = today;
    row.windowStartAt = todayStart;
    row.windowEndAt = new Date(todayStart.getTime() + DAY_MS);

    const saved = await repo.save(row);
    return toRecord(saved, now);
  }
};
