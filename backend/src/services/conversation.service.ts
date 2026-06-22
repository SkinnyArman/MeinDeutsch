import {
  debriefConversation,
  openConversation,
  replyInConversation,
  type ConversationScenarioInput
} from "../ai/analysis.client.js";
import { API_MESSAGES } from "../constants/api-messages.js";
import {
  CONVERSATION_OPENING_ANGLES,
  CONVERSATION_SCENARIOS,
  CONVERSATION_SCENARIO_BY_ID
} from "../constants/conversation-scenarios.config.js";
import type { ConversationMessageRecord } from "../models/conversation-message.model.js";
import type { ConversationDebrief, ConversationRecord } from "../models/conversation.model.js";
import { conversationRepository } from "../repositories/conversation.repository.js";
import { userRepository } from "../repositories/user.repository.js";
import { AppError } from "../utils/app-error.js";
import { dailyGoalService } from "./daily-goal.service.js";

const scenarioInput = (scenarioId: string): ConversationScenarioInput => {
  const scenario = CONVERSATION_SCENARIO_BY_ID[scenarioId];
  return { aiRole: scenario.aiRole, setting: scenario.setting };
};

// Transcript fed to the model. "Partner" = the AI character, "Du" = the learner.
const buildTranscript = (messages: ConversationMessageRecord[]): string =>
  messages.map((m) => `${m.role === "assistant" ? "Partner" : "Du"}: ${m.content}`).join("\n");

export const conversationService = {
  listScenarios(): Array<{ id: string; label: string; category: string }> {
    return CONVERSATION_SCENARIOS.map((s) => ({ id: s.id, label: s.label, category: s.category }));
  },

  async start(input: { userId: number; scenarioId: string }): Promise<{
    conversation: ConversationRecord;
    messages: ConversationMessageRecord[];
  }> {
    const scenario = CONVERSATION_SCENARIO_BY_ID[input.scenarioId];
    if (!scenario) {
      throw new AppError(400, "VALIDATION_FAILED", API_MESSAGES.errors.validationFailed);
    }
    const user = await userRepository.findById(input.userId);
    const level = user?.cefrLevel ?? null;

    const conversation = await conversationRepository.create({
      userId: input.userId,
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      cefrLevel: level
    });

    const angle = CONVERSATION_OPENING_ANGLES[Math.floor(Math.random() * CONVERSATION_OPENING_ANGLES.length)];
    const opener = await openConversation(scenarioInput(scenario.id), level, angle);
    const message = await conversationRepository.addMessage({
      userId: input.userId,
      conversationId: conversation.id,
      role: "assistant",
      content: opener
    });

    return { conversation, messages: [message] };
  },

  async sendMessage(input: {
    userId: number;
    conversationId: number;
    content: string;
  }): Promise<{ reply: ConversationMessageRecord }> {
    const conversation = await conversationRepository.findById({
      userId: input.userId,
      conversationId: input.conversationId
    });
    if (!conversation) {
      throw new AppError(404, "CONVERSATION_NOT_FOUND", API_MESSAGES.errors.conversationNotFound);
    }
    if (conversation.status === "ended") {
      throw new AppError(409, "CONVERSATION_ENDED", API_MESSAGES.errors.conversationEnded);
    }

    await conversationRepository.addMessage({
      userId: input.userId,
      conversationId: input.conversationId,
      role: "user",
      content: input.content
    });

    const history = await conversationRepository.listMessages({ conversationId: input.conversationId });
    const replyText = await replyInConversation({
      scenario: scenarioInput(conversation.scenarioId),
      level: conversation.cefrLevel,
      transcript: buildTranscript(history)
    });
    const reply = await conversationRepository.addMessage({
      userId: input.userId,
      conversationId: input.conversationId,
      role: "assistant",
      content: replyText
    });

    await dailyGoalService.recordGoalProgress(input.userId);
    return { reply };
  },

  async end(input: { userId: number; conversationId: number }): Promise<ConversationRecord> {
    const conversation = await conversationRepository.findById({
      userId: input.userId,
      conversationId: input.conversationId
    });
    if (!conversation) {
      throw new AppError(404, "CONVERSATION_NOT_FOUND", API_MESSAGES.errors.conversationNotFound);
    }

    const history = await conversationRepository.listMessages({ conversationId: input.conversationId });
    const hasUserTurns = history.some((m) => m.role === "user");

    const debrief: ConversationDebrief = hasUserTurns
      ? await debriefConversation({ level: conversation.cefrLevel, transcript: buildTranscript(history) })
      : { summary: "", corrections: [], suggestions: [] };

    const updated = await conversationRepository.endConversation({
      userId: input.userId,
      conversationId: input.conversationId,
      debrief
    });
    if (!updated) {
      throw new AppError(404, "CONVERSATION_NOT_FOUND", API_MESSAGES.errors.conversationNotFound);
    }

    await dailyGoalService.recordGoalProgress(input.userId);
    return updated;
  },

  async getConversation(input: {
    userId: number;
    conversationId: number;
  }): Promise<ConversationRecord & { messages: ConversationMessageRecord[] }> {
    const conversation = await conversationRepository.findById({
      userId: input.userId,
      conversationId: input.conversationId
    });
    if (!conversation) {
      throw new AppError(404, "CONVERSATION_NOT_FOUND", API_MESSAGES.errors.conversationNotFound);
    }
    const messages = await conversationRepository.listMessages({ conversationId: input.conversationId });
    return { ...conversation, messages };
  },

  async deleteConversation(input: { userId: number; conversationId: number }): Promise<void> {
    const deleted = await conversationRepository.deleteConversation({
      userId: input.userId,
      conversationId: input.conversationId
    });
    if (!deleted) {
      throw new AppError(404, "CONVERSATION_NOT_FOUND", API_MESSAGES.errors.conversationNotFound);
    }
  },

  async listHistory(input: { userId: number; limit?: number; offset?: number }): Promise<{
    items: Array<ConversationRecord & { messageCount: number; preview: string | null }>;
    total: number;
    limit: number;
    offset: number;
    hasMore: boolean;
  }> {
    const limit = input.limit ?? 20;
    const offset = input.offset ?? 0;
    const { items, total } = await conversationRepository.listForUser({ userId: input.userId, limit, offset });
    return { items, total, limit, offset, hasMore: offset + items.length < total };
  }
};
