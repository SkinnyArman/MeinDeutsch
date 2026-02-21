import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "vocabulary_items" })
@Unique("uq_vocabulary_normalized_word_category", ["normalizedWord", "category"])
export class VocabularyItem {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

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
