import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn
} from "typeorm";
import { User } from "./user.model.js";

export interface ConversationCorrection {
  original: string;
  correction: string;
  note: string;
}

export interface ConversationVocabSuggestion {
  word: string;
  description: string;
  examples: string[];
}

export interface ConversationDebrief {
  summary: string;
  corrections: ConversationCorrection[];
  suggestions: ConversationVocabSuggestion[];
}

@Entity({ name: "conversations" })
export class Conversation {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "bigint" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "scenario_id", type: "text" })
  scenarioId!: string;

  @Column({ name: "scenario_label", type: "text" })
  scenarioLabel!: string;

  @Column({ name: "status", type: "text", default: "active" })
  status!: "active" | "ended";

  @Column({ name: "cefr_level", type: "text", nullable: true })
  cefrLevel!: string | null;

  @Column({ name: "debrief", type: "jsonb", nullable: true })
  debrief!: ConversationDebrief | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;

  @Column({ name: "ended_at", type: "timestamptz", nullable: true })
  endedAt!: Date | null;
}

export interface ConversationRecord {
  id: number;
  scenarioId: string;
  scenarioLabel: string;
  status: "active" | "ended";
  cefrLevel: string | null;
  debrief: ConversationDebrief | null;
  createdAt: string;
  endedAt: string | null;
}
