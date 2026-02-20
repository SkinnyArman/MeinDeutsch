import type { DailyTalkStreakRecord } from "../models/streak-status.model.js";
import { streakRepository } from "../repositories/streak.repository.js";

export const streakService = {
  async getDailyTalkStatus(now = new Date()): Promise<DailyTalkStreakRecord> {
    return streakRepository.getDailyTalkStatus(now);
  },

  async recordDailyTalkCompletion(now = new Date()): Promise<DailyTalkStreakRecord> {
    return streakRepository.recordDailyTalkCompletion(now);
  }
};
