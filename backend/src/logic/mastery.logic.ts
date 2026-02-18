import type { AnalysisError } from "../types/submission.types.js";

export const calculateMasteryDelta = (errors: AnalysisError[], targetType: string): number => {
  const hit = errors.find((err) => err.type === targetType);
  if (!hit) {
    return 1;
  }

  return Math.max(-5, -1 - hit.severity * 4);
};
