import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";
import { AnswerLog } from "../models/answer-log.model.js";
import { KnowledgeItem } from "../models/knowledge-item.model.js";
import { MistakeStat } from "../models/mistake-stat.model.js";
import { Question } from "../models/question.model.js";
import { StreakStatus } from "../models/streak-status.model.js";
import { Topic } from "../models/topic.model.js";

export const appDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  entities: [AnswerLog, MistakeStat, Topic, Question, KnowledgeItem, StreakStatus],
  synchronize: env.NODE_ENV !== "production",
  logging: false
});
