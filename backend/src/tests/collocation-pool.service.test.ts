import test from "node:test";
import assert from "node:assert/strict";

import type { CollocationPromptRecord } from "../models/collocation-prompt.model.js";
import { collocationRepository } from "../repositories/collocation.repository.js";
import {
  collocationPoolRefillScheduler,
  collocationService
} from "../services/collocation.service.js";

const prompt = (id: number): CollocationPromptRecord => ({
  id,
  englishText: "to take on responsibility",
  clozeSentence: "In meiner neuen Rolle muss ich mehr ____.",
  collocationType: "verb_noun",
  generationCategory: "work",
  createdAt: "2026-06-12T00:00:00.000Z"
});

test("next collocation returns an available prompt without waiting for pool generation", async () => {
  const originalUnseen = collocationRepository.listUnseenPromptsByCategory;
  const originalMarkViewed = collocationRepository.markPromptViewed;
  const originalSchedule = collocationPoolRefillScheduler.schedule;
  let scheduled = false;
  let markedPromptId: number | null = null;

  collocationRepository.listUnseenPromptsByCategory = async () => [prompt(1), prompt(2)];
  collocationRepository.markPromptViewed = async (input) => {
    markedPromptId = input.promptId;
  };
  collocationPoolRefillScheduler.schedule = () => {
    scheduled = true;
    return true;
  };

  try {
    const result = await collocationService.getNextPrompt({ userId: 5, category: "work" });
    assert.equal(result.id, 1);
    assert.equal(markedPromptId, 1);
    assert.equal(scheduled, true);
  } finally {
    collocationRepository.listUnseenPromptsByCategory = originalUnseen;
    collocationRepository.markPromptViewed = originalMarkViewed;
    collocationPoolRefillScheduler.schedule = originalSchedule;
  }
});

test("next collocation recycles the least recently viewed prompt when unseen pool is empty", async () => {
  const originalUnseen = collocationRepository.listUnseenPromptsByCategory;
  const originalRecycle = collocationRepository.findLeastRecentlyViewedPrompt;
  const originalMarkViewed = collocationRepository.markPromptViewed;
  const originalSchedule = collocationPoolRefillScheduler.schedule;
  let recycleCalled = false;

  collocationRepository.listUnseenPromptsByCategory = async () => [];
  collocationRepository.findLeastRecentlyViewedPrompt = async () => {
    recycleCalled = true;
    return prompt(9);
  };
  collocationRepository.markPromptViewed = async () => undefined;
  collocationPoolRefillScheduler.schedule = () => true;

  try {
    const result = await collocationService.getNextPrompt({ userId: 5, category: "work" });
    assert.equal(result.id, 9);
    assert.equal(recycleCalled, true);
  } finally {
    collocationRepository.listUnseenPromptsByCategory = originalUnseen;
    collocationRepository.findLeastRecentlyViewedPrompt = originalRecycle;
    collocationRepository.markPromptViewed = originalMarkViewed;
    collocationPoolRefillScheduler.schedule = originalSchedule;
  }
});
