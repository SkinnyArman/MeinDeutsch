import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { ExpressionPrompt } from "./expression-prompt.model.js";

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

  @Column({ name: "is_semantically_correct", type: "boolean", default: false })
  isSemanticallyCorrect!: boolean;

  @Column({ name: "is_natural_german", type: "boolean", default: false })
  isNaturalGerman!: boolean;

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
  isSemanticallyCorrect: boolean;
  isNaturalGerman: boolean;
  feedback: string;
  nativeLikeVersion: string;
  alternatives: string[];
  createdAt: string;
}
