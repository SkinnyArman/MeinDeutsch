import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

export interface ExpressionReviewScorePoint {
  score: number;
  at: string;
}

@Entity({ name: "expression_review_items" })
export class ExpressionReviewItem {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "user_id", type: "bigint", nullable: true })
  userId!: string | null;

  @Column({ name: "english_text", type: "text" })
  englishText!: string;

  @Column({ name: "normalized_english_text", type: "text" })
  normalizedEnglishText!: string;

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

  @Column({ name: "baseline_native_like_version", type: "text" })
  baselineNativeLikeVersion!: string;

  @Column({ name: "baseline_alternatives", type: "jsonb", default: [] })
  baselineAlternatives!: string[];

  @Column({ name: "baseline_feedback", type: "text" })
  baselineFeedback!: string;

  @Column({ name: "score_history", type: "jsonb", default: [] })
  scoreHistory!: ExpressionReviewScorePoint[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

export interface ExpressionReviewItemRecord {
  id: number;
  englishText: string;
  initialScore: number;
  lastScore: number;
  successCount: number;
  reviewAttemptCount: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  status: "active" | "graduated";
  baselineNativeLikeVersion: string;
  baselineAlternatives: string[];
  baselineFeedback: string;
  scoreHistory: ExpressionReviewScorePoint[];
  createdAt: string;
  updatedAt: string;
}
