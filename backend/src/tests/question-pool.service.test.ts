import test from "node:test";
import assert from "node:assert/strict";

import type { QuestionRecord } from "../models/question.model.js";
import { questionRepository } from "../repositories/question.repository.js";
import { questionPoolRefillScheduler, questionService } from "../services/question.service.js";

const question = (id: number): QuestionRecord => ({
  id,
  topicId: 7,
  topicName: "Work",
  questionText: `Frage ${id}?`,
  cefrTarget: "B2",
  generationPrompt: "template",
  source: "ai",
  createdAt: "2026-06-12T00:00:00.000Z"
});

test("next question returns an available unseen question without waiting for pool generation", async () => {
  const originalUnseen = questionRepository.listUnseenByTopic;
  const originalMarkViewed = questionRepository.markViewed;
  const originalSchedule = questionPoolRefillScheduler.schedule;
  let scheduled = false;
  let markedQuestionId: number | null = null;

  questionRepository.listUnseenByTopic = async () => [question(1), question(2)];
  questionRepository.markViewed = async (input) => {
    markedQuestionId = input.questionId;
  };
  questionPoolRefillScheduler.schedule = () => {
    scheduled = true;
    return true;
  };

  try {
    const result = await questionService.getNextQuestion({ userId: 5, topicId: 7 });
    assert.equal(result.id, 1);
    assert.equal(markedQuestionId, 1);
    assert.equal(scheduled, true);
  } finally {
    questionRepository.listUnseenByTopic = originalUnseen;
    questionRepository.markViewed = originalMarkViewed;
    questionPoolRefillScheduler.schedule = originalSchedule;
  }
});

test("next question recycles the least recently viewed question when unseen pool is empty", async () => {
  const originalUnseen = questionRepository.listUnseenByTopic;
  const originalRecycle = questionRepository.findLeastRecentlyViewed;
  const originalMarkViewed = questionRepository.markViewed;
  const originalSchedule = questionPoolRefillScheduler.schedule;
  let recycleCalled = false;

  questionRepository.listUnseenByTopic = async () => [];
  questionRepository.findLeastRecentlyViewed = async () => {
    recycleCalled = true;
    return question(9);
  };
  questionRepository.markViewed = async () => undefined;
  questionPoolRefillScheduler.schedule = () => true;

  try {
    const result = await questionService.getNextQuestion({ userId: 5, topicId: 7 });
    assert.equal(result.id, 9);
    assert.equal(recycleCalled, true);
  } finally {
    questionRepository.listUnseenByTopic = originalUnseen;
    questionRepository.findLeastRecentlyViewed = originalRecycle;
    questionRepository.markViewed = originalMarkViewed;
    questionPoolRefillScheduler.schedule = originalSchedule;
  }
});
