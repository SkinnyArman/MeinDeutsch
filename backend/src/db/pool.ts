import "reflect-metadata";
import { DataSource } from "typeorm";
import { env } from "../config/env.js";
import { AnswerLog } from "../models/answer-log.model.js";
import { MistakeStat } from "../models/mistake-stat.model.js";

export const appDataSource = new DataSource({
  type: "postgres",
  url: env.DATABASE_URL,
  entities: [AnswerLog, MistakeStat],
  synchronize: env.NODE_ENV !== "production",
  logging: false
});
