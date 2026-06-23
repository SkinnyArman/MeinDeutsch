import { generateQuestion } from "../ai/analysis.client.js";
import { QUESTION_GENERATION_TEMPLATE } from "../constants/question-generation-template.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import { logger } from "../config/logger.js";
import type { QuestionRecord } from "../models/question.model.js";
import { questionRepository } from "../repositories/question.repository.js";
import { topicRepository } from "../repositories/topic.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import { buildLearnerContext } from "./learner-context.service.js";
import { createRefillQueue } from "../utils/refill-queue.js";

const QUESTION_POOL_GENERATION_SIZE = 8;
const QUESTION_MIN_UNSEEN_BUFFER = 3;
const QUESTION_AVOID_LIST_SIZE = 30;
const QUESTION_MAX_CONCURRENT_REFILLS = 2;

// Fallback ladder for users without an assessed level yet.
const QUESTION_POOL_CEFR_TARGETS = ["B1", "B2", "B2", "C1"] as const;

const pickPoolCefrTarget = (): string =>
  QUESTION_POOL_CEFR_TARGETS[Math.floor(Math.random() * QUESTION_POOL_CEFR_TARGETS.length)] as string;

const generateQuestionsForTopic = async (input: {
  userId: number;
  topicId: number;
  count: number;
}): Promise<QuestionRecord[]> => {
  const topic = await topicRepository.findById(input.topicId, input.userId);
  if (!topic) {
    throw new AppError(404, "TOPIC_NOT_FOUND", API_MESSAGES.errors.topicNotFound);
  }

  // Questions are tuned to the learner's assessed CEFR level (set once via the
  // placement exam, adjustable). Falls back to the B1-C1 ladder if unset.
  const user = await userRepository.findById(input.userId);
  const userLevel = user?.cefrLevel ?? null;
  const { profileText } = await buildLearnerContext(input.userId);

  const avoidTexts = new Set(
    (
      await questionRepository.listRecentQuestionTexts({
        userId: input.userId,
        topicId: input.topicId,
        limit: QUESTION_AVOID_LIST_SIZE
      })
    ).map((text) => text.trim())
  );

  const created: QuestionRecord[] = [];
  for (let i = 0; i < input.count; i += 1) {
    const generated = await generateQuestion({
      topicName: topic.name,
      topicDescription: topic.description,
      generationPrompt: QUESTION_GENERATION_TEMPLATE,
      cefrTarget: userLevel ?? pickPoolCefrTarget(),
      avoidQuestionTexts: Array.from(avoidTexts),
      learnerProfile: profileText
    });

    if (avoidTexts.has(generated.questionText.trim())) {
      continue;
    }
    avoidTexts.add(generated.questionText.trim());

    created.push(
      await questionRepository.createAIQuestion({
        userId: input.userId,
        topicId: input.topicId,
        questionText: generated.questionText,
        cefrTarget: generated.cefrTarget ?? undefined,
        generationPrompt: QUESTION_GENERATION_TEMPLATE
      })
    );
  }

  return created;
};

const questionRefillQueue = createRefillQueue<{ userId: number; topicId: number }>({
  maxConcurrent: QUESTION_MAX_CONCURRENT_REFILLS,
  run: async (input) => {
    await generateQuestionsForTopic({
      userId: input.userId,
      topicId: input.topicId,
      count: QUESTION_POOL_GENERATION_SIZE
    });
  },
  onError: (input, error) => {
    logger.error("Question pool background refill failed", {
      topicId: input.topicId,
      error: error instanceof Error ? error.message : error
    });
  }
});

export const scheduleQuestionPoolRefill = (input: { userId: number; topicId: number }): boolean => {
  return questionRefillQueue.schedule(`${input.userId}:${input.topicId}`, input);
};

export const questionPoolRefillScheduler = {
  schedule: scheduleQuestionPoolRefill
};

export const questionService = {
  async generateAndStore(input: {
    userId: number;
    topicId: number;
    cefrTarget?: string;
  }): Promise<QuestionRecord> {
    const topic = await topicRepository.findById(input.topicId, input.userId);
    if (!topic) {
      throw new AppError(404, "TOPIC_NOT_FOUND", API_MESSAGES.errors.topicNotFound);
    }

    const generated = await generateQuestion({
      topicName: topic.name,
      topicDescription: topic.description,
      generationPrompt: QUESTION_GENERATION_TEMPLATE,
      cefrTarget: input.cefrTarget
    });

    return questionRepository.createAIQuestion({
      userId: input.userId,
      topicId: input.topicId,
      questionText: generated.questionText,
      cefrTarget: generated.cefrTarget ?? input.cefrTarget,
      generationPrompt: QUESTION_GENERATION_TEMPLATE
    });
  },

  async getNextQuestion(input: { userId: number; topicId: number }): Promise<QuestionRecord> {
    const unseen = await questionRepository.listUnseenByTopic({
      userId: input.userId,
      topicId: input.topicId,
      limit: QUESTION_MIN_UNSEEN_BUFFER
    });

    let nextQuestion: QuestionRecord | null = unseen[0] ?? null;
    if (!nextQuestion) {
      nextQuestion = await questionRepository.findLeastRecentlyViewed({
        userId: input.userId,
        topicId: input.topicId
      });
    }

    if (!nextQuestion) {
      const generated = await generateQuestionsForTopic({
        userId: input.userId,
        topicId: input.topicId,
        count: 1
      });
      nextQuestion = generated[0] ?? null;
    }

    if (!nextQuestion) {
      throw new AppError(404, "QUESTION_NOT_FOUND", API_MESSAGES.errors.questionNotFound);
    }

    await questionRepository.markViewed({ userId: input.userId, questionId: nextQuestion.id });

    if (unseen.length < QUESTION_MIN_UNSEEN_BUFFER) {
      questionPoolRefillScheduler.schedule(input);
    }

    return nextQuestion;
  },

  async listQuestions(userId: number, topicId?: number): Promise<QuestionRecord[]> {
    return questionRepository.list(userId, topicId);
  }
};
