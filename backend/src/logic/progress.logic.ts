import { CEFR_LEVELS } from "../contracts/api-types.js";

export interface ReadinessSignals {
  currentLevel: string | null;
  // Recent Alltagssprache + Kollokationen scores (0-100).
  recentScores: number[];
  // CEFR levels the AI graded recent writing answers at.
  recentAnswerLevels: string[];
  activeDaysLast14: number;
}

export interface ReadinessBreakdown {
  // Each 0-100.
  accuracy: number;
  production: number;
  consistency: number;
}

export interface Readiness {
  percent: number;
  breakdown: ReadinessBreakdown;
}

const clamp01 = (n: number): number => Math.max(0, Math.min(1, n));

const levelIndex = (level: string | null): number =>
  level ? CEFR_LEVELS.indexOf(level as (typeof CEFR_LEVELS)[number]) : -1;

export const nextLevelOf = (level: string | null): string | null => {
  const i = levelIndex(level);
  if (i < 0 || i >= CEFR_LEVELS.length - 1) {
    return null; // unknown, or already at C2
  }
  return CEFR_LEVELS[i + 1];
};

// Readiness to move up a CEFR band. Transparent blend of three signals so the
// UI can show WHY. Heuristic, not a certified test — labelled as such in the UI.
//   accuracy    (45%): how well recent Alltag/Kollok scores sit vs a ~90 target
//   production  (35%): share of recent writing answers graded at/above current level
//   consistency (20%): active days in the last 14 (10+ = full)
const WEIGHTS = { accuracy: 0.45, production: 0.35, consistency: 0.2 };
const ACCURACY_TARGET = 90;
const CONSISTENCY_TARGET_DAYS = 10;

export const computeReadiness = (signals: ReadinessSignals): Readiness => {
  const accuracy = signals.recentScores.length
    ? clamp01(signals.recentScores.reduce((a, b) => a + b, 0) / signals.recentScores.length / ACCURACY_TARGET)
    : 0;

  const currentIdx = levelIndex(signals.currentLevel);
  const production =
    currentIdx >= 0 && signals.recentAnswerLevels.length
      ? signals.recentAnswerLevels.filter((lvl) => levelIndex(lvl) >= currentIdx).length /
        signals.recentAnswerLevels.length
      : 0;

  const consistency = clamp01(signals.activeDaysLast14 / CONSISTENCY_TARGET_DAYS);

  const percent = Math.round(
    100 * (WEIGHTS.accuracy * accuracy + WEIGHTS.production * production + WEIGHTS.consistency * consistency)
  );

  return {
    percent,
    breakdown: {
      accuracy: Math.round(accuracy * 100),
      production: Math.round(production * 100),
      consistency: Math.round(consistency * 100)
    }
  };
};
