import { appDataSource } from "../db/pool.js";
import {
  Conversation,
  type ConversationDebrief,
  type ConversationRecord
} from "../models/conversation.model.js";
import {
  ConversationMessage,
  type ConversationMessageRecord
} from "../models/conversation-message.model.js";

const toRecord = (entity: Conversation): ConversationRecord => ({
  id: Number(entity.id),
  scenarioId: entity.scenarioId,
  scenarioLabel: entity.scenarioLabel,
  status: entity.status,
  cefrLevel: entity.cefrLevel ?? null,
  debrief: entity.debrief ?? null,
  createdAt: entity.createdAt.toISOString(),
  endedAt: entity.endedAt ? entity.endedAt.toISOString() : null
});

const toMessageRecord = (entity: ConversationMessage): ConversationMessageRecord => ({
  id: Number(entity.id),
  role: entity.role,
  content: entity.content,
  createdAt: entity.createdAt.toISOString()
});

export const conversationRepository = {
  async create(input: {
    userId: number;
    scenarioId: string;
    scenarioLabel: string;
    cefrLevel: string | null;
  }): Promise<ConversationRecord> {
    const repo = appDataSource.getRepository(Conversation);
    const created = repo.create({
      userId: String(input.userId),
      scenarioId: input.scenarioId,
      scenarioLabel: input.scenarioLabel,
      status: "active",
      cefrLevel: input.cefrLevel,
      debrief: null
    });
    const saved = await repo.save(created);
    return toRecord(saved);
  },

  async findById(input: { userId: number; conversationId: number }): Promise<ConversationRecord | null> {
    const repo = appDataSource.getRepository(Conversation);
    const row = await repo.findOne({
      where: { id: String(input.conversationId), userId: String(input.userId) }
    });
    return row ? toRecord(row) : null;
  },

  async addMessage(input: {
    userId: number;
    conversationId: number;
    role: "assistant" | "user";
    content: string;
  }): Promise<ConversationMessageRecord> {
    const repo = appDataSource.getRepository(ConversationMessage);
    const created = repo.create({
      userId: String(input.userId),
      conversationId: String(input.conversationId),
      role: input.role,
      content: input.content
    });
    const saved = await repo.save(created);
    return toMessageRecord(saved);
  },

  async listMessages(input: { conversationId: number }): Promise<ConversationMessageRecord[]> {
    const repo = appDataSource.getRepository(ConversationMessage);
    const rows = await repo.find({
      where: { conversationId: String(input.conversationId) },
      order: { createdAt: "ASC", id: "ASC" }
    });
    return rows.map(toMessageRecord);
  },

  async endConversation(input: {
    userId: number;
    conversationId: number;
    debrief: ConversationDebrief;
  }): Promise<ConversationRecord | null> {
    const repo = appDataSource.getRepository(Conversation);
    const row = await repo.findOne({
      where: { id: String(input.conversationId), userId: String(input.userId) }
    });
    if (!row) {
      return null;
    }
    row.status = "ended";
    row.debrief = input.debrief;
    row.endedAt = new Date();
    const saved = await repo.save(row);
    return toRecord(saved);
  },

  async listForUser(input: { userId: number; limit: number; offset: number }): Promise<{
    items: Array<ConversationRecord & { messageCount: number; preview: string | null }>;
    total: number;
  }> {
    const repo = appDataSource.getRepository(Conversation);
    const [rows, total] = await repo.findAndCount({
      where: { userId: String(input.userId) },
      order: { createdAt: "DESC" },
      take: input.limit,
      skip: input.offset
    });

    const items = await Promise.all(
      rows.map(async (row) => {
        const msgRepo = appDataSource.getRepository(ConversationMessage);
        const messageCount = await msgRepo.count({ where: { conversationId: row.id } });
        const firstUser = await msgRepo.findOne({
          where: { conversationId: row.id, role: "user" },
          order: { createdAt: "ASC" }
        });
        return {
          ...toRecord(row),
          messageCount,
          preview: firstUser?.content ?? null
        };
      })
    );

    return { items, total };
  },

  async deleteConversation(input: { userId: number; conversationId: number }): Promise<boolean> {
    const repo = appDataSource.getRepository(Conversation);
    const result = await repo.delete({ id: String(input.conversationId), userId: String(input.userId) });
    return Boolean(result.affected && result.affected > 0);
  },

  // Count user turns since a timestamp (for the daily goal).
  async countUserMessagesSince(input: { userId: number; since: Date }): Promise<number> {
    const repo = appDataSource.getRepository(ConversationMessage);
    return repo
      .createQueryBuilder("m")
      .where("m.user_id = :userId", { userId: String(input.userId) })
      .andWhere("m.role = 'user'")
      .andWhere("m.created_at >= :since", { since: input.since.toISOString() })
      .getCount();
  }
};
