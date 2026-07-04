import type { ProgressOverview } from "../contracts/api-types.js";
import { computeReadiness, nextLevelOf } from "../logic/progress.logic.js";
import { dashboardRepository } from "../repositories/dashboard.repository.js";
import { learnerProfileRepository } from "../repositories/learner-profile.repository.js";
import { progressRepository } from "../repositories/progress.repository.js";
import { DAILY_GOAL_FEATURE_KEY, streakRepository } from "../repositories/streak.repository.js";
import { userRepository } from "../repositories/user.repository.js";

const RECENT_SCORES = 20;
const RECENT_ANSWERS = 12;
const ACTIVITY_WINDOW = 14;

export const progressService = {
  async getProgress(userId: number, now = new Date()): Promise<ProgressOverview> {
    const [user, recentScores, recentAnswerLevels, activity, topMistakes, streak] = await Promise.all([
      userRepository.findById(userId),
      progressRepository.recentScores(userId, RECENT_SCORES),
      progressRepository.recentAnswerLevels(userId, RECENT_ANSWERS),
      dashboardRepository.getActivitySeries(userId, ACTIVITY_WINDOW, now),
      learnerProfileRepository.listTopMistakes(userId, 5),
      streakRepository.getStatus(userId, DAILY_GOAL_FEATURE_KEY, now)
    ]);

    const currentLevel = user?.cefrLevel ?? null;
    const activeDaysLast14 = activity.filter(
      (d) => d.dailyTalk + d.alltagssprache + d.kollokationen + d.vocabulary + d.gespraech > 0
    ).length;

    const readiness = computeReadiness({
      currentLevel,
      recentScores,
      recentAnswerLevels,
      activeDaysLast14
    });

    return {
      currentLevel,
      nextLevel: nextLevelOf(currentLevel),
      readinessPercent: readiness.percent,
      breakdown: readiness.breakdown,
      recentScores: [...recentScores].reverse(), // oldest→newest for a sparkline
      recentAnswerLevels,
      topMistakes,
      activeDaysLast14,
      longestStreak: streak.longestStreak,
      currentStreak: streak.currentStreak
    };
  }
};
