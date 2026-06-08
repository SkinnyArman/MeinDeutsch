import test from "node:test";
import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

import { VOCABULARY_REVIEW_RATINGS } from "../contracts/api-types.js";
import { appDataSource } from "../db/pool.js";
import { ExpressionPrompt } from "../models/expression-prompt.model.js";
import { ExpressionPromptView } from "../models/expression-prompt-view.model.js";
import { User } from "../models/user.model.js";
import { VocabularyItem } from "../models/vocabulary-item.model.js";
import { VocabularyReviewLog } from "../models/vocabulary-review-log.model.js";
import {
  expressionRepository,
  normalizeExpressionPromptText
} from "../repositories/expression.repository.js";
import { vocabularyService } from "../services/vocabulary.service.js";

test("database-backed concurrency and user-isolation risks", async (context) => {
  await appDataSource.initialize();
  const suffix = randomUUID();
  const userRepo = appDataSource.getRepository(User);
  const vocabRepo = appDataSource.getRepository(VocabularyItem);
  const promptRepo = appDataSource.getRepository(ExpressionPrompt);
  const promptViewRepo = appDataSource.getRepository(ExpressionPromptView);
  const reviewLogRepo = appDataSource.getRepository(VocabularyReviewLog);

  const firstUser = await userRepo.save(userRepo.create({
    googleSub: `integration-first-${suffix}`,
    email: `integration-first-${suffix}@example.com`,
    displayName: "Integration First",
    avatarUrl: null
  }));
  const secondUser = await userRepo.save(userRepo.create({
    googleSub: `integration-second-${suffix}`,
    email: `integration-second-${suffix}@example.com`,
    displayName: "Integration Second",
    avatarUrl: null
  }));
  const uniquePromptText = `Concurrency prompt ${suffix}`;

  try {
    await context.test("concurrent prompt creation produces exactly one normalized row", async () => {
      const results = await Promise.all(
        Array.from({ length: 12 }, (_, index) =>
          expressionRepository.createPrompt({
            userId: Number(firstUser.id),
            englishText: index % 2 === 0
              ? `  ${uniquePromptText}  `
              : uniquePromptText.toUpperCase(),
            generatedContext: "integration_test",
            generationCategory: "work"
          })
        )
      );

      assert.equal(new Set(results.map((result) => result.id)).size, 1);
      const count = await promptRepo.count({
        where: {
          generationCategory: "work",
          normalizedEnglishText: normalizeExpressionPromptText(uniquePromptText)
        }
      });
      assert.equal(count, 1);
    });

    await context.test("concurrent seen markers produce one user-prompt row", async () => {
      const prompt = await expressionRepository.findPromptByTextAndCategory({
        englishText: uniquePromptText,
        generationCategory: "work"
      });
      assert.ok(prompt);

      await Promise.all(
        Array.from({ length: 12 }, () =>
          expressionRepository.markPromptViewed({
            userId: Number(firstUser.id),
            promptId: prompt.id
          })
        )
      );

      const count = await promptViewRepo.count({
        where: {
          userId: firstUser.id,
          promptId: String(prompt.id)
        }
      });
      assert.equal(count, 1);
    });

    await context.test("due queue is database-filtered and isolated by user", async () => {
      const now = new Date("2026-06-08T12:00:00.000Z");
      const due = await vocabRepo.save(vocabRepo.create({
        userId: firstUser.id,
        word: `due-${suffix}`,
        normalizedWord: `due-${suffix}`,
        description: "due",
        examples: ["due"],
        category: "Integration",
        srsDueAt: new Date(now.getTime() - 60_000)
      }));
      await vocabRepo.save(vocabRepo.create({
        userId: firstUser.id,
        word: `future-${suffix}`,
        normalizedWord: `future-${suffix}`,
        description: "future",
        examples: ["future"],
        category: "Integration",
        srsDueAt: new Date(now.getTime() + 60_000)
      }));
      await vocabRepo.save(vocabRepo.create({
        userId: secondUser.id,
        word: `other-${suffix}`,
        normalizedWord: `other-${suffix}`,
        description: "other user",
        examples: ["other"],
        category: "Integration",
        srsDueAt: new Date(now.getTime() - 60_000)
      }));

      const queue = await vocabularyService.listDueReviewQueue({
        userId: Number(firstUser.id),
        limit: 20,
        now
      });

      assert.deepEqual(queue.items.map((item) => item.id), [Number(due.id)]);
      assert.equal(queue.dueCount, 1);
      assert.equal(queue.nextDueAt, new Date(now.getTime() + 60_000).toISOString());
    });

    await context.test("concurrent ratings advance a due card only once", async () => {
      const now = new Date();
      const card = await vocabRepo.save(vocabRepo.create({
        userId: firstUser.id,
        word: `lock-${suffix}`,
        normalizedWord: `lock-${suffix}`,
        description: "locking test",
        examples: ["locking test"],
        category: "Integration",
        srsDueAt: new Date(now.getTime() - 60_000)
      }));

      const results = await Promise.allSettled([
        vocabularyService.reviewWord({
          userId: Number(firstUser.id),
          vocabularyId: Number(card.id),
          rating: VOCABULARY_REVIEW_RATINGS.GOOD,
          now
        }),
        vocabularyService.reviewWord({
          userId: Number(firstUser.id),
          vocabularyId: Number(card.id),
          rating: VOCABULARY_REVIEW_RATINGS.GOOD,
          now
        })
      ]);

      assert.equal(results.filter((result) => result.status === "fulfilled").length, 1);
      assert.equal(results.filter((result) => result.status === "rejected").length, 1);
      const saved = await vocabRepo.findOneByOrFail({ id: card.id });
      assert.equal(saved.srsReviewCount, 1);
      const logs = await reviewLogRepo.find({
        where: {
          userId: firstUser.id,
          vocabularyItemId: card.id
        }
      });
      assert.equal(logs.length, 1);
      assert.equal(logs[0]?.rating, VOCABULARY_REVIEW_RATINGS.GOOD);
    });
  } finally {
    await promptRepo.delete({
      generationCategory: "work",
      normalizedEnglishText: normalizeExpressionPromptText(uniquePromptText)
    });
    await userRepo.delete([firstUser.id, secondUser.id]);
    await appDataSource.destroy();
  }
});
