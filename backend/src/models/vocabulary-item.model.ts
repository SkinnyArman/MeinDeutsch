import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "vocabulary_items" })
@Unique("uq_vocabulary_user_word_category", ["userId", "normalizedWord", "category"])
export class VocabularyItem {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "user_id", type: "bigint", nullable: true })
  userId!: string | null;

  @Column({ type: "text" })
  word!: string;

  @Index()
  @Column({ name: "normalized_word", type: "text" })
  normalizedWord!: string;

  @Column({ type: "text" })
  description!: string;

  @Column({ type: "jsonb", default: [] })
  examples!: string[];

  @Index()
  @Column({ type: "text", default: "General" })
  category!: string;

  @Column({ name: "source_answer_log_id", type: "bigint", nullable: true })
  sourceAnswerLogId!: string | null;

  @Column({ name: "source_question_id", type: "bigint", nullable: true })
  sourceQuestionId!: string | null;

  @Column({ name: "srs_interval_days", type: "integer", default: 0 })
  srsIntervalDays!: number;

  @Column({ name: "srs_ease_factor", type: "double precision", default: 2.5 })
  srsEaseFactor!: number;

  @Column({ name: "srs_due_at", type: "timestamptz", nullable: true })
  srsDueAt!: Date | null;

  @Column({ name: "srs_last_rating", type: "integer", nullable: true })
  srsLastRating!: number | null;

  @Column({ name: "srs_review_count", type: "integer", default: 0 })
  srsReviewCount!: number;

  @Column({ name: "srs_lapse_count", type: "integer", default: 0 })
  srsLapseCount!: number;

  @Column({ name: "srs_last_reviewed_at", type: "timestamptz", nullable: true })
  srsLastReviewedAt!: Date | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface VocabularyItemRecord {
  id: number;
  word: string;
  description: string;
  examples: string[];
  category: string;
  sourceAnswerLogId: number | null;
  sourceQuestionId: number | null;
  srsIntervalDays: number;
  srsEaseFactor: number;
  srsDueAt: string | null;
  srsLastRating: number | null;
  srsReviewCount: number;
  srsLapseCount: number;
  srsLastReviewedAt: string | null;
  createdAt: string;
}
