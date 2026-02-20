import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, PrimaryGeneratedColumn } from "typeorm";
import { AnswerLog } from "./answer-log.model.js";
import { Question } from "./question.model.js";
import { Topic } from "./topic.model.js";

@Entity({ name: "knowledge_items" })
export class KnowledgeItem {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "topic_id", type: "bigint", nullable: true })
  topicId!: string | null;

  @ManyToOne(() => Topic, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "topic_id" })
  topic!: Topic | null;

  @Column({ name: "question_id", type: "bigint", nullable: true })
  questionId!: string | null;

  @ManyToOne(() => Question, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "question_id" })
  question!: Question | null;

  @Column({ name: "answer_log_id", type: "bigint", nullable: true })
  answerLogId!: string | null;

  @ManyToOne(() => AnswerLog, { nullable: true, onDelete: "SET NULL" })
  @JoinColumn({ name: "answer_log_id" })
  answerLog!: AnswerLog | null;

  @Column({ name: "item_type", type: "text", default: "daily_talk_submission" })
  itemType!: string;

  @Column({ name: "text_chunk", type: "text" })
  textChunk!: string;

  @Column({ type: "jsonb", default: {} })
  metadata!: Record<string, unknown>;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface KnowledgeItemRecord {
  id: number;
  topicId: number | null;
  topicName?: string;
  questionId: number | null;
  answerLogId: number | null;
  itemType: string;
  textChunk: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}
