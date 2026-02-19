import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { AnalysisError } from "../types/submission.types.js";

@Entity({ name: "answer_logs" })
export class AnswerLog {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "prompt", type: "text" })
  questionText!: string;

  @Column({ name: "answer_text", type: "text" })
  answerText!: string;

  @Column({ name: "cefr_level", type: "text", default: "unknown" })
  cefrLevel!: string;

  @Column({ name: "error_types", type: "jsonb" })
  errorTypes!: AnalysisError[];

  @Column({ type: "jsonb" })
  tips!: string[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface AnswerLogRecord {
  id: number;
  questionText: string;
  answerText: string;
  cefrLevel: string;
  errorTypes: AnalysisError[];
  tips: string[];
  createdAt: string;
}
