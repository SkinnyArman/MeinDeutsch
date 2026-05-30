import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { ExpressionPrompt } from "./expression-prompt.model.js";

@Entity({ name: "expression_prompt_views" })
@Unique("uq_expression_prompt_view_user_prompt", ["userId", "promptId"])
export class ExpressionPromptView {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "user_id", type: "bigint" })
  userId!: string;

  @Column({ name: "prompt_id", type: "bigint" })
  promptId!: string;

  @ManyToOne(() => ExpressionPrompt, { onDelete: "CASCADE" })
  @JoinColumn({ name: "prompt_id" })
  prompt!: ExpressionPrompt;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
