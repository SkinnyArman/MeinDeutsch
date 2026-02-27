import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ExpressionPrompt } from "./expression-prompt.model.js";

export interface ExpressionAttemptHistoryPoint {
  id: number;
  userAnswerText: string;
  naturalnessScore: number;
  createdAt: string;
}

@Entity({ name: "expression_attempts" })
export class ExpressionAttempt {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "user_id", type: "bigint", nullable: true })
  userId!: string | null;

  @Column({ name: "prompt_id", type: "bigint" })
  promptId!: string;

  @ManyToOne(() => ExpressionPrompt, { onDelete: "CASCADE" })
  @JoinColumn({ name: "prompt_id" })
  prompt!: ExpressionPrompt;

  @Column({ name: "english_text", type: "text" })
  englishText!: string;

  @Column({ name: "user_answer_text", type: "text" })
  userAnswerText!: string;

  @Column({ name: "naturalness_score", type: "integer", default: 0 })
  naturalnessScore!: number;

  @Column({ type: "text" })
  feedback!: string;

  @Column({ name: "native_like_version", type: "text" })
  nativeLikeVersion!: string;

  @Column({ type: "jsonb", default: [] })
  alternatives!: string[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface ExpressionAttemptRecord {
  id: number;
  promptId: number;
  englishText: string;
  userAnswerText: string;
  naturalnessScore: number;
  feedback: string;
  nativeLikeVersion: string;
  alternatives: string[];
  attemptHistory: ExpressionAttemptHistoryPoint[];
  createdAt: string;
}
