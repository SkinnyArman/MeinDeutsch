import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import type { VocabularyReviewRating } from "../contracts/api-types.js";
import { User } from "./user.model.js";
import { VocabularyItem } from "./vocabulary-item.model.js";

@Entity({ name: "vocabulary_review_logs" })
export class VocabularyReviewLog {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "bigint" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Index()
  @Column({ name: "vocabulary_item_id", type: "bigint" })
  vocabularyItemId!: string;

  @ManyToOne(() => VocabularyItem, { onDelete: "CASCADE" })
  @JoinColumn({ name: "vocabulary_item_id" })
  vocabularyItem!: VocabularyItem;

  @Column({ type: "integer" })
  rating!: VocabularyReviewRating;

  @Column({ name: "previous_due_at", type: "timestamptz", nullable: true })
  previousDueAt!: Date | null;

  @Column({ name: "next_due_at", type: "timestamptz" })
  nextDueAt!: Date;

  @Column({ name: "previous_interval_days", type: "integer" })
  previousIntervalDays!: number;

  @Column({ name: "next_interval_days", type: "integer" })
  nextIntervalDays!: number;

  @Column({ name: "previous_ease_factor", type: "double precision" })
  previousEaseFactor!: number;

  @Column({ name: "next_ease_factor", type: "double precision" })
  nextEaseFactor!: number;

  @CreateDateColumn({ name: "reviewed_at", type: "timestamptz" })
  reviewedAt!: Date;
}
