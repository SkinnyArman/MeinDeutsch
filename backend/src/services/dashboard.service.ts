import type { DashboardOverviewPayload } from "../contracts/api-types.js";
import { collocationReviewRepository } from "../repositories/collocation-review.repository.js";
import { dashboardRepository } from "../repositories/dashboard.repository.js";
import { expressionReviewRepository } from "../repositories/expression-review.repository.js";
import { vocabularyRepository } from "../repositories/vocabulary.repository.js";
import { dailyGoalService } from "./daily-goal.service.js";

const ACTIVITY_DAYS = 14;
const TREND_POINTS = 20;

export const dashboardService = {
  async getOverview(userId: number, now = new Date()): Promise<DashboardOverviewPayload> {
    const [goal, activity, totals, trends, latestCefrLevel, vocabularyDue, alltagReviewDue, kollokReviewDue] =
      await Promise.all([
        dailyGoalService.getDailyGoal(userId, now),
        dashboardRepository.getActivitySeries(userId, ACTIVITY_DAYS, now),
        dashboardRepository.getTotals(userId),
        dashboardRepository.getScoreTrends(userId, TREND_POINTS),
        dashboardRepository.getLatestCefrLevel(userId),
        vocabularyRepository.countDue({ userId, now }),
        expressionReviewRepository.countDueItems(userId),
        collocationReviewRepository.countDueItems(userId)
      ]);

    return {
      goal,
      activity,
      totals,
      due: {
        vocabulary: vocabularyDue,
        alltagReview: alltagReviewDue,
        kollokReview: kollokReviewDue
      },
      trends,
      latestCefrLevel
    };
  }
};
