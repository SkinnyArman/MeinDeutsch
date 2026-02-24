import type { DailyTalkStreakRecord } from "../models/streak-status.model.js";
import { streakRepository } from "../repositories/streak.repository.js";

export const streakService = {
  async getDailyTalkStatus(userId: number, now = new Date()): Promise<DailyTalkStreakRecord> {
    return streakRepository.getDailyTalkStatus(userId, now);
  },

  async recordDailyTalkCompletion(userId: number, now = new Date()): Promise<DailyTalkStreakRecord> {
    return streakRepository.recordDailyTalkCompletion(userId, now);
  }
};
