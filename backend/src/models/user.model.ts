import { Column, CreateDateColumn, Entity, PrimaryGeneratedColumn, Unique } from "typeorm";

@Entity({ name: "users" })
@Unique("uq_users_google_sub", ["googleSub"])
@Unique("uq_users_email", ["email"])
export class User {
  @PrimaryGeneratedColumn({ type: "bigint" })
  id!: string;

  @Column({ name: "google_sub", type: "text" })
  googleSub!: string;

  @Column({ type: "text" })
  email!: string;

  @Column({ name: "display_name", type: "text", nullable: true })
  displayName!: string | null;

  @Column({ name: "avatar_url", type: "text", nullable: true })
  avatarUrl!: string | null;

  @CreateDateColumn({ name: "created_at", type: "timestamptz" })
  createdAt!: Date;
}

export interface UserRecord {
  id: number;
  googleSub: string;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
  createdAt: string;
}
