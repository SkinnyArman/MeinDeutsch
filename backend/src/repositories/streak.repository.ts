import type { EntityManager } from "typeorm";
import { appDataSource } from "../db/pool.js";
import { type DailyTalkStreakRecord, type StreakRecord, StreakStatus } from "../models/streak-status.model.js";

const DAILY_TALK_FEATURE_KEY = "daily_talk";
export const DAILY_GOAL_FEATURE_KEY = "daily_goal";
const DAY_MS = 24 * 60 * 60 * 1000;

const startOfUtcDay = (date: Date): Date => new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

const formatDateOnly = (date: Date): string => date.toISOString().slice(0, 10);

const toRecord = (entity: StreakStatus, now: Date): StreakRecord => ({
  featureKey: entity.featureKey,
  currentStreak: entity.currentStreak,
  longestStreak: entity.longestStreak,
  hasCompletedToday: entity.lastCompletionDate === formatDateOnly(now),
  lastCompletionDate: entity.lastCompletionDate,
  windowStartAt: entity.windowStartAt.toISOString(),
  windowEndAt: entity.windowEndAt.toISOString(),
  remainingMs: Math.max(0, entity.windowEndAt.getTime() - now.getTime())
});

const ensureRow = async (
  userId: number,
  featureKey: string,
  now: Date,
  manager?: EntityManager
): Promise<StreakStatus> => {
  const repo = (manager ?? appDataSource.manager).getRepository(StreakStatus);
  const existing = await repo.findOne({ where: { userId: String(userId), featureKey } });
  if (existing) {
    return existing;
  }

  const dayStart = startOfUtcDay(now);
  const created = repo.create({
    userId: String(userId),
    featureKey,
    currentStreak: 0,
    longestStreak: 0,
    lastCompletionDate: null,
    windowStartAt: dayStart,
    windowEndAt: new Date(dayStart.getTime() + DAY_MS)
  });

  return repo.save(created);
};

export const streakRepository = {
  async getStatus(userId: number, featureKey: string, now: Date, manager?: EntityManager): Promise<StreakRecord> {
    const row = await ensureRow(userId, featureKey, now, manager);

    const todayStart = startOfUtcDay(now);
    const todayEnd = new Date(todayStart.getTime() + DAY_MS);

    if (row.windowStartAt.getTime() !== todayStart.getTime() || row.windowEndAt.getTime() !== todayEnd.getTime()) {
      row.windowStartAt = todayStart;
      row.windowEndAt = todayEnd;
      await (manager ?? appDataSource.manager).getRepository(StreakStatus).save(row);
    }

    return toRecord(row, now);
  },

  async recordCompletion(
    userId: number,
    featureKey: string,
    now: Date,
    manager?: EntityManager
  ): Promise<StreakRecord> {
    const repo = (manager ?? appDataSource.manager).getRepository(StreakStatus);
    const row = await ensureRow(userId, featureKey, now, manager);

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
  },

  async getDailyTalkStatus(userId: number, now: Date, manager?: EntityManager): Promise<DailyTalkStreakRecord> {
    return (await this.getStatus(userId, DAILY_TALK_FEATURE_KEY, now, manager)) as DailyTalkStreakRecord;
  },

  async recordDailyTalkCompletion(
    userId: number,
    now: Date,
    manager?: EntityManager
  ): Promise<DailyTalkStreakRecord> {
    return (await this.recordCompletion(userId, DAILY_TALK_FEATURE_KEY, now, manager)) as DailyTalkStreakRecord;
  }
};
