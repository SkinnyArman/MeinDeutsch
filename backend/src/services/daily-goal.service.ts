import type { DailyGoalState } from "../contracts/api-types.js";
import { DAILY_GOAL_TARGET, computeDailyGoalSteps, countCompleted, isDailyGoalComplete } from "../logic/daily-goal.logic.js";
import { logger } from "../config/logger.js";
import { dashboardRepository } from "../repositories/dashboard.repository.js";
import { DAILY_GOAL_FEATURE_KEY, streakRepository } from "../repositories/streak.repository.js";
import { vocabularyRepository } from "../repositories/vocabulary.repository.js";

const startOfUtcDay = (date: Date): Date =>
  new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));

export const dailyGoalService = {
  async getDailyGoal(userId: number, now = new Date()): Promise<DailyGoalState> {
    const todayStart = startOfUtcDay(now);
    const [countsToday, vocabularyDueNow] = await Promise.all([
      dashboardRepository.getSectionCountsSince(userId, todayStart),
      vocabularyRepository.countDue({ userId, now })
    ]);

    const steps = computeDailyGoalSteps({ countsToday, vocabularyDueNow });
    const allDone = isDailyGoalComplete(steps);

    const streak = allDone
      ? await streakRepository.recordCompletion(userId, DAILY_GOAL_FEATURE_KEY, now)
      : await streakRepository.getStatus(userId, DAILY_GOAL_FEATURE_KEY, now);

    return {
      steps,
      completedCount: countCompleted(steps),
      totalSteps: steps.length,
      target: Math.min(DAILY_GOAL_TARGET, steps.length),
      allDone,
      streak
    };
  },

  /**
   * Post-write hook for the four task sections. Recomputes the goal so the
   * streak is recorded the moment the last missing section completes.
   * Never throws — goal bookkeeping must not fail the user's action.
   */
  async recordGoalProgress(userId: number): Promise<void> {
    try {
      await this.getDailyGoal(userId);
    } catch (error) {
      logger.error("Daily goal progress check failed", error);
    }
  }
};
