import { assessLevel, CEFR_LEVELS, generateLevelExam, type LevelExamQuestion } from "../ai/analysis.client.js";
import { API_MESSAGES } from "../constants/api-messages.js";
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

export const levelService = {
  async getLevel(userId: number): Promise<UserLevelState> {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new AppError(401, "AUTH_INVALID_SESSION", API_MESSAGES.errors.authInvalidSession);
    }
    return toLevelState(user);
  },

  async getExam(): Promise<LevelExamQuestion[]> {
    return generateLevelExam();
  },

  async assessExam(input: {
    userId: number;
    answers: Array<{ targetLevel: string; questionText: string; answerText: string }>;
  }): Promise<UserLevelState> {
    const result = await assessLevel(input.answers);
    const updated = await userRepository.setCefrLevel({
      userId: input.userId,
      cefrLevel: result.cefrLevel,
      cefrRationale: result.rationale
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
