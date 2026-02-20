import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import type { AnalysisError } from "../types/submission.types.js";
import { Question } from "./question.model.js";

@Entity({ name: "answer_logs" })
export class AnswerLog {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "prompt", type: "text" })
  questionText!: string;

  @Column({ name: "question_id", type: "bigint", nullable: true })
  questionId!: string | null;

  @ManyToOne(() => Question, (question) => question.answerLogs, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "question_id" })
  question!: Question | null;

  @Column({ name: "answer_text", type: "text" })
  answerText!: string;

  @Column({ name: "corrected_text", type: "text", default: "" })
  correctedText!: string;

  @Column({ name: "cefr_level", type: "text", default: "unknown" })
  cefrLevel!: string;

  @Column({ name: "error_types", type: "jsonb" })
  errorTypes!: AnalysisError[];

  @Column({ type: "jsonb" })
  tips!: string[];

  @Column({ name: "contextual_word_suggestions", type: "jsonb", default: [] })
  contextualWordSuggestions!: string[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface AnswerLogRecord {
  id: number;
  questionId: number | null;
  questionText: string;
  answerText: string;
  correctedText: string;
  cefrLevel: string;
  errorTypes: AnalysisError[];
  tips: string[];
  contextualWordSuggestions: string[];
  createdAt: string;
}
