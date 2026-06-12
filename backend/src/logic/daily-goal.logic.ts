import type { DailyGoalStepKey, DailyGoalStepState } from "../contracts/api-types.js";

export interface DailyGoalInputs {
  countsToday: {
    dailyTalk: number;
    alltagssprache: number;
    kollokationen: number;
    vocabulary: number;
  };
  vocabularyDueNow: number;
}

export const DAILY_GOAL_STEP_KEYS: DailyGoalStepKey[] = [
  "dailyTalk",
  "alltagssprache",
  "kollokationen",
  "vocabulary"
];

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
    }
  ];
};

export const isDailyGoalComplete = (steps: DailyGoalStepState[]): boolean =>
  steps.every((step) => step.done);
