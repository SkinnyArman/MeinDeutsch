import { Column, Entity, PrimaryGeneratedColumn, UpdateDateColumn } from "typeorm";

@Entity({ name: "streak_status" })
export class StreakStatus {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "feature_key", type: "text", unique: true })
  featureKey!: string;

  @Column({ name: "current_streak", type: "integer", default: 0 })
  currentStreak!: number;

  @Column({ name: "longest_streak", type: "integer", default: 0 })
  longestStreak!: number;

  @Column({ name: "last_completion_date", type: "date", nullable: true })
  lastCompletionDate!: string | null;

  @Column({ name: "window_start_at", type: "timestamptz" })
  windowStartAt!: Date;

  @Column({ name: "window_end_at", type: "timestamptz" })
  windowEndAt!: Date;

  @UpdateDateColumn({ name: "updated_at", type: "timestamptz" })
  updatedAt!: Date;
}

export interface DailyTalkStreakRecord {
  featureKey: "daily_talk";
  currentStreak: number;
  longestStreak: number;
  hasCompletedToday: boolean;
  lastCompletionDate: string | null;
  windowStartAt: string;
  windowEndAt: string;
  remainingMs: number;
}
