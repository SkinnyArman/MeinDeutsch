import { generateQuestion } from "../ai/analysis.client.js";
import { QUESTION_GENERATION_TEMPLATE } from "../constants/question-generation-template.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import type { QuestionRecord } from "../models/question.model.js";
import { questionRepository } from "../repositories/question.repository.js";
import { topicRepository } from "../repositories/topic.repository.js";
import { AppError } from "../utils/app-error.js";

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

  async listQuestions(userId: number, topicId?: number): Promise<QuestionRecord[]> {
    return questionRepository.list(userId, topicId);
  }
};
