import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";
import { AnswerLog } from "../models/answer-log.model.js";
import { CollocationAttempt } from "../models/collocation-attempt.model.js";
import { CollocationPrompt } from "../models/collocation-prompt.model.js";
import { CollocationPromptView } from "../models/collocation-prompt-view.model.js";
import { CollocationReviewItem } from "../models/collocation-review-item.model.js";
import { ExpressionAttempt } from "../models/expression-attempt.model.js";
import { ExpressionPrompt } from "../models/expression-prompt.model.js";
import { ExpressionPromptView } from "../models/expression-prompt-view.model.js";
import { ExpressionReviewItem } from "../models/expression-review-item.model.js";
import { KnowledgeItem } from "../models/knowledge-item.model.js";
import { MistakeStat } from "../models/mistake-stat.model.js";
import { Question } from "../models/question.model.js";
import { StreakStatus } from "../models/streak-status.model.js";
import { Topic } from "../models/topic.model.js";
import { User } from "../models/user.model.js";
import { VocabularyItem } from "../models/vocabulary-item.model.js";
import { VocabularyReviewLog } from "../models/vocabulary-review-log.model.js";
import { InitialSchemaAndUserOwnership1780880000000 } from "./migrations/1780880000000-InitialSchemaAndUserOwnership.js";
import { EnforceExpressionPromptUniqueness1780881000000 } from "./migrations/1780881000000-EnforceExpressionPromptUniqueness.js";
import { AddVocabularyDueIndex1780882000000 } from "./migrations/1780882000000-AddVocabularyDueIndex.js";
import { AddVocabularyReviewHistory1780883000000 } from "./migrations/1780883000000-AddVocabularyReviewHistory.js";
import { AddQuestionViewTracking1780884000000 } from "./migrations/1780884000000-AddQuestionViewTracking.js";
import { AddCollocationTables1780885000000 } from "./migrations/1780885000000-AddCollocationTables.js";
import { AddExpressionSituation1780886000000 } from "./migrations/1780886000000-AddExpressionSituation.js";

export const appDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  entities: [
    User,
    AnswerLog,
    MistakeStat,
    Topic,
    Question,
    KnowledgeItem,
    StreakStatus,
    VocabularyItem,
    ExpressionPrompt,
    ExpressionPromptView,
    ExpressionAttempt,
    ExpressionReviewItem,
    CollocationPrompt,
    CollocationPromptView,
    CollocationAttempt,
    CollocationReviewItem,
    VocabularyReviewLog
  ],
  migrations: [
    InitialSchemaAndUserOwnership1780880000000,
    EnforceExpressionPromptUniqueness1780881000000,
    AddVocabularyDueIndex1780882000000,
    AddVocabularyReviewHistory1780883000000,
    AddQuestionViewTracking1780884000000,
    AddCollocationTables1780885000000,
    AddExpressionSituation1780886000000
  ],
  migrationsRun: true,
  synchronize: false,
  logging: false
});
