import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { User } from "./user.model.js";

@Entity({ name: "expression_prompts" })
@Index(
  "uq_expression_prompts_category_normalized_text",
  ["generationCategory", "normalizedEnglishText"],
  { unique: true }
)
export class ExpressionPrompt {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "user_id", type: "bigint", nullable: true })
  userId!: string | null;

  @ManyToOne(() => User, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "user_id" })
  createdByUser!: User | null;

  @Column({ name: "english_text", type: "text" })
  englishText!: string;

  @Column({ name: "normalized_english_text", type: "text" })
  normalizedEnglishText!: string;

  @Column({ name: "generated_context", type: "text", nullable: true })
  generatedContext!: string | null;

  @Column({ name: "generation_category", type: "text", default: "random" })
  generationCategory!: string;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface ExpressionPromptRecord {
  id: number;
  englishText: string;
  generatedContext: string | null;
  generationCategory: string;
  createdAt: string;
}
