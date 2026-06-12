import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn
} from "typeorm";
import { User } from "./user.model.js";

export interface CollocationReviewScorePoint {
  score: number;
  at: string;
}

@Entity({ name: "collocation_review_items" })
export class CollocationReviewItem {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "bigint" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "german_text", type: "text" })
  germanText!: string;

  @Column({ name: "normalized_german_text", type: "text" })
  normalizedGermanText!: string;

  @Column({ name: "english_text", type: "text" })
  englishText!: string;

  @Column({ name: "cloze_sentence", type: "text" })
  clozeSentence!: string;

  @Column({ name: "initial_score", type: "integer" })
  initialScore!: number;

  @Column({ name: "last_score", type: "integer" })
  lastScore!: number;

  @Column({ name: "success_count", type: "integer", default: 0 })
  successCount!: number;

  @Column({ name: "review_attempt_count", type: "integer", default: 0 })
  reviewAttemptCount!: number;

  @Column({ name: "next_review_at", type: "timestamptz" })
  nextReviewAt!: Date;

  @Column({ name: "last_reviewed_at", type: "timestamptz", nullable: true })
  lastReviewedAt!: Date | null;

  @Column({ name: "status", type: "text", default: "active" })
  status!: "active" | "graduated";

  @Column({ name: "baseline_correct_version", type: "text" })
  baselineCorrectVersion!: string;

  @Column({ name: "baseline_alternatives", type: "jsonb", default: [] })
  baselineAlternatives!: string[];

  @Column({ name: "baseline_feedback", type: "text" })
  baselineFeedback!: string;

  @Column({ name: "score_history", type: "jsonb", default: [] })
  scoreHistory!: CollocationReviewScorePoint[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

export interface CollocationReviewItemRecord {
  id: number;
  germanText: string;
  englishText: string;
  clozeSentence: string;
  initialScore: number;
  lastScore: number;
  successCount: number;
  reviewAttemptCount: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  status: "active" | "graduated";
  baselineCorrectVersion: string;
  baselineAlternatives: string[];
  baselineFeedback: string;
  scoreHistory: CollocationReviewScorePoint[];
  createdAt: string;
  updatedAt: string;
}
