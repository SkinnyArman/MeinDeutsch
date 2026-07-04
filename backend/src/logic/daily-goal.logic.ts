import type { DailyGoalStepKey, DailyGoalStepState } from "../contracts/api-types.js";

export interface DailyGoalInputs {
  countsToday: {
    dailyTalk: number;
    alltagssprache: number;
    kollokationen: number;
    vocabulary: number;
    gespraech: number;
  };
  vocabularyDueNow: number;
}

export const DAILY_GOAL_STEP_KEYS: DailyGoalStepKey[] = [
  "dailyTalk",
  "alltagssprache",
  "kollokationen",
  "vocabulary",
  "gespraech"
];

// How many sections count as "done for today". Kept well below the total so the
// daily streak is achievable in one sitting (research: consistency > volume).
export const DAILY_GOAL_TARGET = 3;

/**
 * A day counts toward the streak when every section saw at least one task.
 * Vocabulary is also satisfied when the due queue is empty — you cannot review
 * cards that are not due, so an empty queue must not block the goal.
 */
export const computeDailyGoalSteps = (inputs: DailyGoalInputs): DailyGoalStepState[] => {
  const { countsToday, vocabularyDueNow } = inputs;
  return [
    { key: "dailyTalk", done: countsToday.dailyTalk > 0, countToday: countsToday.dailyTalk },
    { key: "alltagssprache", done: countsToday.alltagssprache > 0, countToday: countsToday.alltagssprache },
    { key: "kollokationen", done: countsToday.kollokationen > 0, countToday: countsToday.kollokationen },
    {
      key: "vocabulary",
      done: countsToday.vocabulary > 0 || vocabularyDueNow === 0,
      countToday: countsToday.vocabulary
    },
    { key: "gespraech", done: countsToday.gespraech > 0, countToday: countsToday.gespraech }
  ];
};

export const countCompleted = (steps: DailyGoalStepState[]): number =>
  steps.filter((step) => step.done).length;

// The day counts toward the streak once TARGET sections are done (not all of them).
export const isDailyGoalComplete = (steps: DailyGoalStepState[]): boolean =>
  countCompleted(steps) >= Math.min(DAILY_GOAL_TARGET, steps.length);
