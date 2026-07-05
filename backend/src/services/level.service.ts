import { assessPlacementLevel, CEFR_LEVELS } from "../ai/analysis.client.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import {
  LEVEL_PLACEMENT_QUESTIONS,
  LEVEL_PLACEMENT_WRITING_PROMPT,
  LEVEL_SELF_ASSESSMENT_OPTIONS,
  type CefrLevel,
  type LevelPlacementQuestion,
  type LevelSelfAssessmentOption
} from "../constants/level-placement.config.js";
import type { UserRecord } from "../models/user.model.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";

export interface UserLevelState {
  cefrLevel: string | null;
  cefrRationale: string | null;
  cefrAssessedAt: string | null;
}

const toLevelState = (user: UserRecord): UserLevelState => ({
  cefrLevel: user.cefrLevel,
  cefrRationale: user.cefrRationale,
  cefrAssessedAt: user.cefrAssessedAt
});

export interface PublicLevelPlacementQuestion {
  id: string;
  targetLevel: CefrLevel;
  skill: string;
  prompt: string;
  options: Array<{ id: string; text: string }>;
}

export interface LevelPlacementExamPayload {
  selfAssessmentOptions: LevelSelfAssessmentOption[];
  questions: PublicLevelPlacementQuestion[];
  writingPrompt: string;
}

export interface LevelPlacementAnswer {
  questionId: string;
  selectedOptionId: string;
}

const publicQuestion = (question: LevelPlacementQuestion): PublicLevelPlacementQuestion => ({
  id: question.id,
  targetLevel: question.targetLevel,
  skill: question.skill,
  prompt: question.prompt,
  options: question.options
});

const levelIndex = (level: string): number => CEFR_LEVELS.indexOf(level as (typeof CEFR_LEVELS)[number]);

const summarizePlacement = (answers: LevelPlacementAnswer[]) => {
  const answerMap = new Map(answers.map((answer) => [answer.questionId, answer.selectedOptionId]));
  const byLevel = new Map<string, { level: string; total: number; correct: number }>();
  const bySkill = new Map<string, { skill: string; total: number; correct: number }>();
  let correct = 0;
  let weightedCorrect = 0;
  let weightedTotal = 0;

  for (const question of LEVEL_PLACEMENT_QUESTIONS) {
    const selected = answerMap.get(question.id);
    const isCorrect = selected === question.correctOptionId;
    const weight = levelIndex(question.targetLevel) + 1;
    weightedTotal += weight;
    if (isCorrect) {
      correct += 1;
      weightedCorrect += weight;
    }

    const levelRow = byLevel.get(question.targetLevel) ?? { level: question.targetLevel, total: 0, correct: 0 };
    levelRow.total += 1;
    levelRow.correct += isCorrect ? 1 : 0;
    byLevel.set(question.targetLevel, levelRow);

    const skillRow = bySkill.get(question.skill) ?? { skill: question.skill, total: 0, correct: 0 };
    skillRow.total += 1;
    skillRow.correct += isCorrect ? 1 : 0;
    bySkill.set(question.skill, skillRow);
  }

  const weightedRatio = weightedTotal > 0 ? weightedCorrect / weightedTotal : 0;
  const preliminaryLevel =
    weightedRatio >= 0.86 ? "C1" :
      weightedRatio >= 0.72 ? "B2" :
        weightedRatio >= 0.55 ? "B1" :
          weightedRatio >= 0.35 ? "A2" :
            "A1";

  return {
    total: LEVEL_PLACEMENT_QUESTIONS.length,
    correct,
    correctRatio: LEVEL_PLACEMENT_QUESTIONS.length > 0 ? correct / LEVEL_PLACEMENT_QUESTIONS.length : 0,
    weightedRatio,
    preliminaryLevel,
    byLevel: Array.from(byLevel.values()),
    bySkill: Array.from(bySkill.values())
  };
};

const placementFloorForScore = (summary: ReturnType<typeof summarizePlacement>): string | null => {
  if (summary.correctRatio >= 0.8) {
    return "B2";
  }
  if (summary.correctRatio >= 0.6) {
    return "B1";
  }
  return null;
};

const applyScoreFloor = (cefrLevel: string, floor: string | null): string => {
  if (!floor || levelIndex(cefrLevel) >= levelIndex(floor)) {
    return cefrLevel;
  }
  return floor;
};

export const levelService = {
  async getLevel(userId: number): Promise<UserLevelState> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(401, "AUTH_INVALID_SESSION", API_MESSAGES.errors.authInvalidSession);
    }
    return toLevelState(user);
  },

  async getExam(): Promise<LevelPlacementExamPayload> {
    return {
      selfAssessmentOptions: LEVEL_SELF_ASSESSMENT_OPTIONS,
      questions: LEVEL_PLACEMENT_QUESTIONS.map(publicQuestion),
      writingPrompt: LEVEL_PLACEMENT_WRITING_PROMPT
    };
  },

  async assessExam(input: {
    userId: number;
    selfEstimate: string;
    answers: LevelPlacementAnswer[];
    writingAnswer: string;
  }): Promise<UserLevelState> {
    const summary = summarizePlacement(input.answers);
    const result = await assessPlacementLevel({
      selfEstimate: input.selfEstimate,
      preliminaryLevel: summary.preliminaryLevel,
      writingPrompt: LEVEL_PLACEMENT_WRITING_PROMPT,
      writingAnswer: input.writingAnswer,
      mcqSummary: {
        total: summary.total,
        correct: summary.correct,
        byLevel: summary.byLevel,
        bySkill: summary.bySkill
      }
    });
    const scoreFloor = placementFloorForScore(summary);
    const finalLevel = applyScoreFloor(result.cefrLevel, scoreFloor);
    const floorNote = finalLevel !== result.cefrLevel
      ? ` Your multiple-choice score supports at least ${finalLevel}, so the app placed you there despite a more conservative writing estimate.`
      : "";
    const updated = await userRepository.setCefrLevel({
      userId: input.userId,
      cefrLevel: finalLevel,
      cefrRationale: `${result.rationale}${floorNote} Multiple-choice score: ${summary.correct}/${summary.total}.`
    });
    if (!updated) {
      throw new AppError(401, "AUTH_INVALID_SESSION", API_MESSAGES.errors.authInvalidSession);
    }
    return toLevelState(updated);
  },

  async setLevelManually(input: { userId: number; cefrLevel: string }): Promise<UserLevelState> {
    if (!CEFR_LEVELS.includes(input.cefrLevel as (typeof CEFR_LEVELS)[number])) {
      throw new AppError(400, "VALIDATION_FAILED", API_MESSAGES.errors.validationFailed);
    }
    const updated = await userRepository.setCefrLevel({
      userId: input.userId,
      cefrLevel: input.cefrLevel,
      cefrRationale: "Set manually."
    });
    if (!updated) {
      throw new AppError(401, "AUTH_INVALID_SESSION", API_MESSAGES.errors.authInvalidSession);
    }
    return toLevelState(updated);
  }
};
