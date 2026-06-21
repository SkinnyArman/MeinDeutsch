import { appDataSource } from "../db/pool.js";
import { User, type UserRecord } from "../models/user.model.js";

const toUserRecord = (entity: User): UserRecord => ({
  id: Number(entity.id),
  googleSub: entity.googleSub,
  email: entity.email,
  displayName: entity.displayName,
  avatarUrl: entity.avatarUrl,
  cefrLevel: entity.cefrLevel ?? null,
  cefrRationale: entity.cefrRationale ?? null,
  cefrAssessedAt: entity.cefrAssessedAt ? entity.cefrAssessedAt.toISOString() : null,
  createdAt: entity.createdAt.toISOString()
});

export const userRepository = {
  async findById(userId: number): Promise<UserRecord | null> {
    const repo = appDataSource.getRepository(User);
    const row = await repo.findOne({ where: { id: String(userId) } });
    return row ? toUserRecord(row) : null;
  },

  async findByGoogleSub(googleSub: string): Promise<UserRecord | null> {
    const repo = appDataSource.getRepository(User);
    const row = await repo.findOne({ where: { googleSub } });
    return row ? toUserRecord(row) : null;
  },

  async findByEmail(email: string): Promise<UserRecord | null> {
    const repo = appDataSource.getRepository(User);
    const row = await repo.findOne({ where: { email: email.toLowerCase() } });
    return row ? toUserRecord(row) : null;
  },

  async create(input: {
    googleSub: string;
    email: string;
    displayName?: string | null;
    avatarUrl?: string | null;
  }): Promise<UserRecord> {
    const repo = appDataSource.getRepository(User);
    const created = repo.create({
      googleSub: input.googleSub,
      email: input.email.toLowerCase(),
      displayName: input.displayName ?? null,
      avatarUrl: input.avatarUrl ?? null
    });
    const saved = await repo.save(created);
    return toUserRecord(saved);
  },

  async setCefrLevel(input: {
    userId: number;
    cefrLevel: string;
    cefrRationale?: string | null;
  }): Promise<UserRecord | null> {
    const repo = appDataSource.getRepository(User);
    await repo.update(
      { id: String(input.userId) },
      {
        cefrLevel: input.cefrLevel,
        cefrRationale: input.cefrRationale ?? null,
        cefrAssessedAt: new Date()
      }
    );
    const row = await repo.findOne({ where: { id: String(input.userId) } });
    return row ? toUserRecord(row) : null;
  }
};
