import { Column, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import type { MistakeType } from "../types/submission.types.js";
import { User } from "./user.model.js";

@Entity({ name: "mistake_stats" })
@Unique("uq_mistake_stats_user_type", ["userId", "mistakeType"])
export class MistakeStat {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Index()
  @Column({ name: "user_id", type: "bigint" })
  userId!: string;

  @ManyToOne(() => User, { onDelete: "CASCADE" })
  @JoinColumn({ name: "user_id" })
  user!: User;

  @Column({ name: "mistake_type", type: "text" })
  mistakeType!: MistakeType;

  @Column({ type: "integer", default: 0 })
  frequency!: number;

  @Column({ name: "severity_score", type: "double precision", default: 0 })
  severityScore!: number;

  @UpdateDateColumn({ name: "last_seen", type: "timestamptz" })
  lastSeen!: Date;
}

export interface MistakeStatRecord {
  mistakeType: MistakeType;
  frequency: number;
  severityScore: number;
  lastSeen: string;
}
