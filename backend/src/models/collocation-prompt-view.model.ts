import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique } from "typeorm";
import { CollocationPrompt } from "./collocation-prompt.model.js";
import { User } from "./user.model.js";

@Entity({ name: "collocation_prompt_views" })
@Unique("uq_collocation_prompt_view_user_prompt", ["userId", "promptId"])
export class CollocationPromptView {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "bigint" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "prompt_id", type: "bigint" })
  promptId!: string;

  @ManyToOne(() => CollocationPrompt, { onDelete: "CASCADE" })
  @JoinColumn({ name: "prompt_id" })
  prompt!: CollocationPrompt;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}
