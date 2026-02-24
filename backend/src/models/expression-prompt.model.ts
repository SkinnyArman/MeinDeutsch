import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn } from "typeorm";

@Entity({ name: "expression_prompts" })
export class ExpressionPrompt {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "user_id", type: "bigint", nullable: true })
  userId!: string | null;

  @Column({ name: "english_text", type: "text" })
  englishText!: string;

  @Column({ name: "generated_context", type: "text", nullable: true })
  generatedContext!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface ExpressionPromptRecord {
  id: number;
  englishText: string;
  generatedContext: string | null;
  createdAt: string;
}
