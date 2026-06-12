import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { CollocationPrompt } from "./collocation-prompt.model.js";
import { User } from "./user.model.js";

export interface CollocationAttemptHistoryPoint {
  id: number;
  userAnswerText: string;
  score: number;
  createdAt: string;
}

@Entity({ name: "collocation_attempts" })
export class CollocationAttempt {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "bigint" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "prompt_id", type: "bigint" })
  promptId!: string;

  @ManyToOne(() => CollocationPrompt, { onDelete: "CASCADE" })
  @JoinColumn({ name: "prompt_id" })
  prompt!: CollocationPrompt;

  @Column({ name: "german_text", type: "text" })
  germanText!: string;

  @Column({ name: "english_text", type: "text" })
  englishText!: string;

  @Column({ name: "cloze_sentence", type: "text" })
  clozeSentence!: string;

  @Column({ name: "user_answer_text", type: "text" })
  userAnswerText!: string;

  @Column({ name: "score", type: "integer", default: 0 })
  score!: number;

  @Column({ type: "text" })
  feedback!: string;

  @Column({ name: "correct_version", type: "text" })
  correctVersion!: string;

  @Column({ type: "jsonb", default: [] })
  alternatives!: string[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface CollocationAttemptRecord {
  id: number;
  promptId: number;
  germanText: string;
  englishText: string;
  clozeSentence: string;
  userAnswerText: string;
  score: number;
  feedback: string;
  correctVersion: string;
  alternatives: string[];
  attemptHistory: CollocationAttemptHistoryPoint[];
  createdAt: string;
}
