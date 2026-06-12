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
  situationText: `Situation ${id}`,
  generatedContext: null,
  generationCategory: "work",
  createdAt: "2026-06-08T00:00:00.000Z"
});

test("next expression serves an unseen prompt in recognition mode without waiting for pool generation", async () => {
  const originalDue = expressionRepository.findDueProductionPrompt;
  const originalUnseen = expressionRepository.listUnseenPromptsByCategory;
  const originalAnswer = expressionRepository.findPromptAnswerById;
  const originalServed = expressionRepository.markRecognitionServed;
  const originalSchedule = expressionPoolRefillScheduler.schedule;
  let scheduled = false;
  let servedPromptId: number | null = null;

  expressionRepository.findDueProductionPrompt = async () => null;
  expressionRepository.listUnseenPromptsByCategory = async () => [prompt(1), prompt(2)];
  expressionRepository.findPromptAnswerById = async () => ({
    nativeAnswer: "Toi, toi, toi!",
    distractors: ["Brich dir ein Bein!", "Viel Glück!"]
  });
  expressionRepository.markRecognitionServed = async (input) => {
    servedPromptId = input.promptId;
  };
  expressionPoolRefillScheduler.schedule = () => {
    scheduled = true;
    return true;
  };

  try {
    const result = await expressionService.getNextPrompt({ userId: 5, category: "work" });
    assert.equal(result.id, 1);
    assert.equal(result.mode, "recognition");
    assert.ok((result.options?.length ?? 0) >= 2);
    assert.equal(servedPromptId, 1);
    assert.equal(scheduled, true);
  } finally {
    expressionRepository.findDueProductionPrompt = originalDue;
    expressionRepository.listUnseenPromptsByCategory = originalUnseen;
    expressionRepository.findPromptAnswerById = originalAnswer;
    expressionRepository.markRecognitionServed = originalServed;
    expressionPoolRefillScheduler.schedule = originalSchedule;
  }
});

test("next expression serves a due production item before any new recognition item", async () => {
  const originalDue = expressionRepository.findDueProductionPrompt;
  const originalUnseen = expressionRepository.listUnseenPromptsByCategory;
  let unseenCalled = false;

  expressionRepository.findDueProductionPrompt = async () => prompt(42);
  expressionRepository.listUnseenPromptsByCategory = async () => {
    unseenCalled = true;
    return [];
  };

  try {
    const result = await expressionService.getNextPrompt({ userId: 5, category: "work" });
    assert.equal(result.id, 42);
    assert.equal(result.mode, "production");
    assert.equal(unseenCalled, false);
  } finally {
    expressionRepository.findDueProductionPrompt = originalDue;
    expressionRepository.listUnseenPromptsByCategory = originalUnseen;
  }
});

test("next expression recycles the least recently viewed prompt (production) when unseen pool is empty", async () => {
  const originalDue = expressionRepository.findDueProductionPrompt;
  const originalUnseen = expressionRepository.listUnseenPromptsByCategory;
  const originalRecycle = expressionRepository.findLeastRecentlyViewedPrompt;
  const originalServed = expressionRepository.markRecognitionServed;
  const originalSchedule = expressionPoolRefillScheduler.schedule;
  let recycleCalled = false;

  expressionRepository.findDueProductionPrompt = async () => null;
  expressionRepository.listUnseenPromptsByCategory = async () => [];
  expressionRepository.findLeastRecentlyViewedPrompt = async () => {
    recycleCalled = true;
    return prompt(9);
  };
  expressionRepository.markRecognitionServed = async () => undefined;
  expressionPoolRefillScheduler.schedule = () => true;

  try {
    const result = await expressionService.getNextPrompt({ userId: 5, category: "work" });
    assert.equal(result.id, 9);
    assert.equal(result.mode, "production");
    assert.equal(recycleCalled, true);
  } finally {
    expressionRepository.findDueProductionPrompt = originalDue;
    expressionRepository.listUnseenPromptsByCategory = originalUnseen;
    expressionRepository.findLeastRecentlyViewedPrompt = originalRecycle;
    expressionRepository.markRecognitionServed = originalServed;
    expressionPoolRefillScheduler.schedule = originalSchedule;
  }
});
