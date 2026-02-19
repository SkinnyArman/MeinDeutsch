import { Column, CreateDateColumn, Entity, JoinColumn, ManyToOne, OneToMany, PrimaryGeneratedColumn } from "typeorm";
import { AnswerLog } from "./answer-log.model.js";
import { Topic } from "./topic.model.js";

@Entity({ name: "questions" })
export class Question {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "topic_id", type: "bigint" })
  topicId!: string;

  @ManyToOne(() => Topic, (topic) => topic.questions, { onDelete: "CASCADE" })
  @JoinColumn({ name: "topic_id" })
  topic!: Topic;

  @Column({ name: "question_text", type: "text" })
  questionText!: string;

  @Column({ name: "cefr_target", type: "text", nullable: true })
  cefrTarget!: string | null;

  @Column({ name: "generation_prompt", type: "text" })
  generationPrompt!: string;

  @Column({ name: "source", type: "text", default: "ai" })
  source!: "ai" | "manual";

  @OneToMany(() => AnswerLog, (answerLog) => answerLog.question)
  answerLogs!: AnswerLog[];

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface QuestionRecord {
  id: number;
  topicId: number;
  topicName?: string;
  questionText: string;
  cefrTarget: string | null;
  generationPrompt: string;
  source: "ai" | "manual";
  createdAt: string;
}
