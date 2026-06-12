import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.model.js";

@Entity({ name: "collocation_prompts" })
@Index(
  "uq_collocation_prompts_category_normalized_text",
  ["generationCategory", "normalizedGermanText"],
  { unique: true }
)
export class CollocationPrompt {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "user_id", type: "bigint", nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  createdByUser!: User | null;

  @Column({ name: "german_text", type: "text" })
  germanText!: string;

  @Column({ name: "normalized_german_text", type: "text" })
  normalizedGermanText!: string;

  @Column({ name: "english_text", type: "text" })
  englishText!: string;

  @Column({ name: "cloze_sentence", type: "text" })
  clozeSentence!: string;

  @Column({ name: "cloze_answer", type: "text" })
  clozeAnswer!: string;

  @Column({ name: "collocation_type", type: "text", default: "verb_noun" })
  collocationType!: string;

  @Column({ name: "generation_category", type: "text", default: "random" })
  generationCategory!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

/**
 * Served practice prompt. Deliberately excludes germanText and clozeAnswer —
 * the learner has to produce them.
 */
export interface CollocationPromptRecord {
  id: number;
  englishText: string;
  clozeSentence: string;
  collocationType: string;
  generationCategory: string;
  createdAt: string;
}
