import { Column, CreateDateColumn, Entity, OneToMany, PrimaryGeneratedColumn, Unique } from "typeorm";
import { Question } from "./question.model.js";

@Entity({ name: "topics" })
@Unique("uq_topics_user_name", ["userId", "name"])
export class Topic {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "user_id", type: "bigint", nullable: true })
  userId!: string | null;

  @Column({ type: "text" })
  name!: string;

  @Column({ type: "text", nullable: true })
  description!: string | null;

  @OneToMany(() => Question, (question) => question.topic)
  questions!: Question[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface TopicRecord {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}
