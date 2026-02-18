import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";
import type { AnalysisError, AnalysisMetrics } from "../types/submission.types.js";

@Entity({ name: "answer_logs" })
export class AnswerLog {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ type: "text" })
  prompt!: string;

  @Column({ name: "answer_text", type: "text" })
  answerText!: string;

  @Column({ name: "corrected_text", type: "text" })
  correctedText!: string;

  @Column({ name: "native_rewrite", type: "text" })
  nativeRewrite!: string;

  @Column({ name: "error_types", type: "jsonb" })
  errorTypes!: AnalysisError[];

  @Column({ type: "jsonb" })
  metrics!: AnalysisMetrics;

  @Column({ type: "jsonb" })
  tips!: string[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface AnswerLogRecord {
  id: number;
  prompt: string;
  answerText: string;
  correctedText: string;
  nativeRewrite: string;
  errorTypes: AnalysisError[];
  metrics: AnalysisMetrics;
  tips: string[];
  createdAt: string;
}
