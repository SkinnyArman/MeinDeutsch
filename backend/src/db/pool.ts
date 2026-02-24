import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";
import { AnswerLog } from "../models/answer-log.model.js";
import { ExpressionAttempt } from "../models/expression-attempt.model.js";
import { ExpressionPrompt } from "../models/expression-prompt.model.js";
import { KnowledgeItem } from "../models/knowledge-item.model.js";
import { MistakeStat } from "../models/mistake-stat.model.js";
import { Question } from "../models/question.model.js";
import { StreakStatus } from "../models/streak-status.model.js";
import { Topic } from "../models/topic.model.js";
import { User } from "../models/user.model.js";
import { VocabularyItem } from "../models/vocabulary-item.model.js";

export const appDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  entities: [User, AnswerLog, MistakeStat, Topic, Question, KnowledgeItem, StreakStatus, VocabularyItem, ExpressionPrompt, ExpressionAttempt],
  synchronize: env.NODE_ENV !== "production",
  logging: false
});
