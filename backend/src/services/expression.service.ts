import { assessExpressionAttempt, generateEverydayExpression } from "../ai/analysis.client.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import type { ExpressionAttemptRecord } from "../models/expression-attempt.model.js";
import type { ExpressionPromptRecord } from "../models/expression-prompt.model.js";
import { expressionRepository } from "../repositories/expression.repository.js";
import { AppError } from "../utils/app-error.js";

export const expressionService = {
  async generatePrompt(userId: number): Promise<ExpressionPromptRecord> {
    const generated = await generateEverydayExpression();
    return expressionRepository.createPrompt({
      userId,
      englishText: generated.englishText,
      generatedContext: generated.generatedContext
    });
  },

  async assessAttempt(input: {
    userId: number;
    promptId: number;
    userAnswerText: string;
  }): Promise<ExpressionAttemptRecord> {
    const prompt = await expressionRepository.findPromptById({
      userId: input.userId,
      promptId: input.promptId
    });
    if (!prompt) {
      throw new AppError(404, "EXPRESSION_PROMPT_NOT_FOUND", API_MESSAGES.errors.expressionPromptNotFound);
    }

    const assessment = await assessExpressionAttempt({
      englishText: prompt.englishText,
      userAnswerText: input.userAnswerText
    });

    return expressionRepository.createAttempt({
      userId: input.userId,
      promptId: input.promptId,
      englishText: prompt.englishText,
      userAnswerText: input.userAnswerText,
      naturalnessScore: Math.round(assessment.naturalnessScore),
      feedback: assessment.feedback,
      nativeLikeVersion: assessment.nativeLikeVersion,
      alternatives: assessment.alternatives
    });
  },

  async listHistory(input: { userId: number; limit?: number }): Promise<ExpressionAttemptRecord[]> {
    return expressionRepository.listAttempts({
      userId: input.userId,
      limit: input.limit ?? 30
    });
  }
};
