import test from "node:test";
import assert from "node:assert/strict";
import type { EntityManager } from "typeorm";

import { appDataSource } from "../db/pool.js";
import type { AnswerLogRecord } from "../models/answer-log.model.js";
import { knowledgeRepository } from "../repositories/knowledge.repository.js";
import { submissionRepository } from "../repositories/submission.repository.js";
import { persistAnalyzedSubmission } from "../services/submission.service.js";
import { streakService } from "../services/streak.service.js";
import type { AnalysisResult } from "../types/submission.types.js";

const analysis: AnalysisResult = {
  cefrLevel: "B1",
  correctedText: "Ich lerne Deutsch.",
  contextualWordSuggestions: [],
  tips: [],
  errors: []
};

const answerLog: AnswerLogRecord = {
  id: 77,
  questionId: 12,
  questionText: "Warum lernst du Deutsch?",
  answerText: "Ich lerne Deutsch.",
  correctedText: "Ich lerne Deutsch.",
  cefrLevel: "B1",
  errorTypes: [],
  tips: [],
  contextualWordSuggestions: [],
  modelUsed: "test-model",
  createdAt: "2026-06-08T00:00:00.000Z"
};

test("Daily Talk persistence uses one transaction manager for every write", async () => {
  const originalTransaction = appDataSource.transaction;
  const originalInsert = submissionRepository.insertAnswerLog;
  const originalKnowledge = knowledgeRepository.createFromSubmission;
  const originalMistakes = submissionRepository.upsertMistakeStats;
  const originalStreak = streakService.recordDailyTalkCompletion;
  const fakeManager = {} as EntityManager;
  const managers: EntityManager[] = [];

  appDataSource.transaction = (async <T>(
    runInTransaction: (manager: EntityManager) => Promise<T>
  ): Promise<T> => runInTransaction(fakeManager)) as typeof appDataSource.transaction;
  submissionRepository.insertAnswerLog = async (_input, _analysis, manager) => {
    managers.push(manager as EntityManager);
    return answerLog;
  };
  knowledgeRepository.createFromSubmission = async (_input, manager) => {
    managers.push(manager as EntityManager);
    return {
      id: 1,
      topicId: 2,
      questionId: 12,
      answerLogId: 77,
      itemType: "daily_talk_submission",
      textChunk: "chunk",
      metadata: {},
      createdAt: "2026-06-08T00:00:00.000Z"
    };
  };
  submissionRepository.upsertMistakeStats = async (_userId, _analysis, manager) => {
    managers.push(manager as EntityManager);
  };
  streakService.recordDailyTalkCompletion = async (_userId, _now, manager) => {
    managers.push(manager as EntityManager);
    return {
      featureKey: "daily_talk",
      currentStreak: 1,
      longestStreak: 1,
      hasCompletedToday: true,
      lastCompletionDate: "2026-06-08",
      windowStartAt: "2026-06-08T00:00:00.000Z",
      windowEndAt: "2026-06-09T00:00:00.000Z",
      remainingMs: 1
    };
  };

  try {
    const result = await persistAnalyzedSubmission({
      userId: 9,
      questionId: 12,
      questionText: answerLog.questionText,
      topicId: 2,
      topicName: "Learning",
      answerText: answerLog.answerText,
      modelUsed: "test-model",
      analysis
    });

    assert.equal(result.id, answerLog.id);
    assert.equal(managers.length, 4);
    assert.equal(managers.every((manager) => manager === fakeManager), true);
  } finally {
    appDataSource.transaction = originalTransaction;
    submissionRepository.insertAnswerLog = originalInsert;
    knowledgeRepository.createFromSubmission = originalKnowledge;
    submissionRepository.upsertMistakeStats = originalMistakes;
    streakService.recordDailyTalkCompletion = originalStreak;
  }
});

test("Daily Talk persistence stops and rejects when a transactional write fails", async () => {
  const originalTransaction = appDataSource.transaction;
  const originalInsert = submissionRepository.insertAnswerLog;
  const originalKnowledge = knowledgeRepository.createFromSubmission;
  const originalMistakes = submissionRepository.upsertMistakeStats;
  const originalStreak = streakService.recordDailyTalkCompletion;
  const fakeManager = {} as EntityManager;
  let mistakeWriteCalled = false;
  let streakWriteCalled = false;

  appDataSource.transaction = (async <T>(
    runInTransaction: (manager: EntityManager) => Promise<T>
  ): Promise<T> => runInTransaction(fakeManager)) as typeof appDataSource.transaction;
  submissionRepository.insertAnswerLog = async () => answerLog;
  knowledgeRepository.createFromSubmission = async () => {
    throw new Error("knowledge write failed");
  };
  submissionRepository.upsertMistakeStats = async () => {
    mistakeWriteCalled = true;
  };
  streakService.recordDailyTalkCompletion = async () => {
    streakWriteCalled = true;
    throw new Error("should not run");
  };

  try {
    await assert.rejects(
      persistAnalyzedSubmission({
        userId: 9,
        questionId: 12,
        questionText: answerLog.questionText,
        answerText: answerLog.answerText,
        modelUsed: "test-model",
        analysis
      }),
      /knowledge write failed/
    );
    assert.equal(mistakeWriteCalled, false);
    assert.equal(streakWriteCalled, false);
  } finally {
    appDataSource.transaction = originalTransaction;
    submissionRepository.insertAnswerLog = originalInsert;
    knowledgeRepository.createFromSubmission = originalKnowledge;
    submissionRepository.upsertMistakeStats = originalMistakes;
    streakService.recordDailyTalkCompletion = originalStreak;
  }
});
