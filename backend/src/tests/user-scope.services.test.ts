import test from "node:test";
import assert from "node:assert/strict";

import { expressionService } from "../services/expression.service.js";
import { knowledgeService } from "../services/knowledge.service.js";
import { questionService } from "../services/question.service.js";
import { submissionService } from "../services/submission.service.js";
import { vocabularyService } from "../services/vocabulary.service.js";
import { expressionRepository } from "../repositories/expression.repository.js";
import { knowledgeRepository } from "../repositories/knowledge.repository.js";
import { questionRepository } from "../repositories/question.repository.js";
import { vocabularyRepository } from "../repositories/vocabulary.repository.js";

const restore = <T extends object, K extends keyof T>(obj: T, key: K, value: T[K]): void => {
  obj[key] = value;
};

test("vocabularyService.listWords passes userId scope to repository", async () => {
  const original = vocabularyRepository.list;
  let capturedUserId: number | null = null;

  vocabularyRepository.list = async (input) => {
    capturedUserId = input.userId;
    return [];
  };

  try {
    await vocabularyService.listWords({ userId: 42, category: "General" });
    assert.equal(capturedUserId, 42);
  } finally {
    restore(vocabularyRepository, "list", original);
  }
});

test("questionService.listQuestions passes userId scope to repository", async () => {
  const original = questionRepository.list;
  let capturedUserId: number | null = null;

  questionRepository.list = async (userId, topicId) => {
    capturedUserId = userId;
    assert.equal(topicId, undefined);
    return [];
  };

  try {
    await questionService.listQuestions(17);
    assert.equal(capturedUserId, 17);
  } finally {
    restore(questionRepository, "list", original);
  }
});

test("knowledgeService.listKnowledge passes userId scope to repository", async () => {
  const original = knowledgeRepository.list;
  let capturedUserId: number | null = null;

  knowledgeRepository.list = async (input) => {
    capturedUserId = input.userId;
    return [];
  };

  try {
    await knowledgeService.listKnowledge({ userId: 9, limit: 10 });
    assert.equal(capturedUserId, 9);
  } finally {
    restore(knowledgeRepository, "list", original);
  }
});

test("expressionService.listHistory passes userId to all repository calls", async () => {
  const originalListAttempts = expressionRepository.listAttempts;
  const originalCountAttempts = expressionRepository.countAttempts;
  const originalListAttemptHistory = expressionRepository.listAttemptHistoryByEnglishTexts;

  const captured: number[] = [];

  expressionRepository.listAttempts = async (input) => {
    captured.push(input.userId);
    return [];
  };
  expressionRepository.countAttempts = async (input) => {
    captured.push(input.userId);
    return 0;
  };
  expressionRepository.listAttemptHistoryByEnglishTexts = async (input) => {
    captured.push(input.userId);
    return {};
  };

  try {
    const result = await expressionService.listHistory({ userId: 33, limit: 10, offset: 0 });
    assert.deepEqual(captured, [33, 33, 33]);
    assert.equal(result.total, 0);
    assert.equal(result.hasMore, false);
  } finally {
    restore(expressionRepository, "listAttempts", originalListAttempts);
    restore(expressionRepository, "countAttempts", originalCountAttempts);
    restore(expressionRepository, "listAttemptHistoryByEnglishTexts", originalListAttemptHistory);
  }
});

test("submissionService.processTextSubmission rejects question from another user scope", async () => {
  const originalFindById = questionRepository.findById;
  let capturedQuestionId: number | null = null;
  let capturedUserId: number | null = null;

  questionRepository.findById = async (questionId, userId) => {
    capturedQuestionId = questionId;
    capturedUserId = userId;
    return null;
  };

  try {
    await assert.rejects(
      submissionService.processTextSubmission({ questionId: 123, answerText: "Antwort" }, 88),
      (error: unknown) => {
        const maybe = error as { statusCode?: number; code?: string };
        return maybe.statusCode === 404 && maybe.code === "QUESTION_NOT_FOUND";
      }
    );
    assert.equal(capturedQuestionId, 123);
    assert.equal(capturedUserId, 88);
  } finally {
    restore(questionRepository, "findById", originalFindById);
  }
});
