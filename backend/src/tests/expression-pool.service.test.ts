import test from "node:test";
import assert from "node:assert/strict";

import type { ExpressionPromptRecord } from "../models/expression-prompt.model.js";
import { expressionRepository } from "../repositories/expression.repository.js";
import {
  expressionPoolRefillScheduler,
  expressionService
} from "../services/expression.service.js";

const prompt = (id: number): ExpressionPromptRecord => ({
  id,
  englishText: `Prompt ${id}`,
  generatedContext: null,
  generationCategory: "work",
  createdAt: "2026-06-08T00:00:00.000Z"
});

test("next expression returns an available prompt without waiting for pool generation", async () => {
  const originalUnseen = expressionRepository.listUnseenPromptsByCategory;
  const originalMarkViewed = expressionRepository.markPromptViewed;
  const originalSchedule = expressionPoolRefillScheduler.schedule;
  let scheduled = false;
  let markedPromptId: number | null = null;

  expressionRepository.listUnseenPromptsByCategory = async () => [prompt(1), prompt(2)];
  expressionRepository.markPromptViewed = async (input) => {
    markedPromptId = input.promptId;
  };
  expressionPoolRefillScheduler.schedule = () => {
    scheduled = true;
    return true;
  };

  try {
    const result = await expressionService.getNextPrompt({ userId: 5, category: "work" });
    assert.equal(result.id, 1);
    assert.equal(markedPromptId, 1);
    assert.equal(scheduled, true);
  } finally {
    expressionRepository.listUnseenPromptsByCategory = originalUnseen;
    expressionRepository.markPromptViewed = originalMarkViewed;
    expressionPoolRefillScheduler.schedule = originalSchedule;
  }
});

test("next expression recycles the least recently viewed prompt when unseen pool is empty", async () => {
  const originalUnseen = expressionRepository.listUnseenPromptsByCategory;
  const originalRecycle = expressionRepository.findLeastRecentlyViewedPrompt;
  const originalMarkViewed = expressionRepository.markPromptViewed;
  const originalSchedule = expressionPoolRefillScheduler.schedule;
  let recycleCalled = false;

  expressionRepository.listUnseenPromptsByCategory = async () => [];
  expressionRepository.findLeastRecentlyViewedPrompt = async () => {
    recycleCalled = true;
    return prompt(9);
  };
  expressionRepository.markPromptViewed = async () => undefined;
  expressionPoolRefillScheduler.schedule = () => true;

  try {
    const result = await expressionService.getNextPrompt({ userId: 5, category: "work" });
    assert.equal(result.id, 9);
    assert.equal(recycleCalled, true);
  } finally {
    expressionRepository.listUnseenPromptsByCategory = originalUnseen;
    expressionRepository.findLeastRecentlyViewedPrompt = originalRecycle;
    expressionRepository.markPromptViewed = originalMarkViewed;
    expressionPoolRefillScheduler.schedule = originalSchedule;
  }
});
