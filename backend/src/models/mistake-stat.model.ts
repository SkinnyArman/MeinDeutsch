import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";
import type { MistakeType } from "../types/submission.types.js";

@Entity({ name: "mistake_stats" })
export class MistakeStat {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "mistake_type", type: "text", unique: true })
  mistakeType!: MistakeType;

  @Column({ type: "integer", default: 0 })
  frequency!: number;

  @Column({ name: "severity_score", type: "double precision", default: 0 })
  severityScore!: number;

  @Column({ name: "mastery_score", type: "double precision", default: 0 })
  masteryScore!: number;

  @UpdateDateColumn({ name: "last_seen", type: "timestamptz" })
  lastSeen!: Date;
}

export interface MistakeStatRecord {
  mistakeType: MistakeType;
  frequency: number;
  severityScore: number;
  masteryScore: number;
  lastSeen: string;
}
