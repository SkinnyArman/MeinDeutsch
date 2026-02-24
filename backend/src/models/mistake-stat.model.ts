import { Column, Entity, PrimaryGeneratedColumn, Unique, UpdateDateColumn } from "typeorm";
import type { MistakeType } from "../types/submission.types.js";

@Entity({ name: "mistake_stats" })
@Unique("uq_mistake_stats_user_type", ["userId", "mistakeType"])
export class MistakeStat {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "user_id", type: "bigint", nullable: true })
  userId!: string | null;

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
