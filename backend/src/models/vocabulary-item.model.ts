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
  createdAt: string;
}
