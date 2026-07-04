import { useMutation, useQuery } from "@/libs/query";
import type {
  ConversationListItem,
  ConversationMessageRecord,
  ConversationRecord,
  ConversationScenarioRecord,
  ConversationWithMessages
} from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

interface Paginated<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
  hasMore: boolean;
}

export const useConversationScenariosQuery = () =>
  useQuery({
    queryKey: ["conversations", "scenarios"],
    queryFn: async () => (await fetchJson<ConversationScenarioRecord[]>(API_PATHS.conversationScenarios)).data,
    staleTime: Infinity
  });

export const useConversationHistoryQuery = () =>
  useQuery({
    queryKey: ["conversations", "history"],
    queryFn: async () => (await fetchJson<Paginated<ConversationListItem>>(API_PATHS.conversations)).data
  });

export const useStartConversationMutation = () =>
  useMutation({
    mutationFn: async (payload: { scenarioId?: string }) =>
      (
        await fetchJson<{ conversation: ConversationRecord; messages: ConversationMessageRecord[] }>(
          API_PATHS.conversations,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
          }
        )
      ).data
  });

export const useSendConversationMessageMutation = () =>
  useMutation({
    mutationFn: async (payload: { conversationId: number; content: string }) =>
      (
        await fetchJson<{ reply: ConversationMessageRecord }>(API_PATHS.conversationMessage(payload.conversationId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content: payload.content })
        })
      ).data
  });

export const useEndConversationMutation = () =>
  useMutation({
    mutationFn: async (payload: { conversationId: number }) =>
      (
        await fetchJson<ConversationRecord>(API_PATHS.conversationEnd(payload.conversationId), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({})
        })
      ).data
  });

export const useDeleteConversationMutation = () =>
  useMutation({
    mutationFn: async (payload: { conversationId: number }) =>
      (
        await fetchJson<{ id: number }>(API_PATHS.conversation(payload.conversationId), {
          method: "DELETE"
        })
      ).data
  });

export const useConversationDetailQuery = (id: () => number | null) =>
  useQuery({
    queryKey: ["conversations", "detail", id],
    queryFn: async () => {
      const conversationId = id();
      if (!conversationId) {
        return null;
      }
      return (await fetchJson<ConversationWithMessages>(API_PATHS.conversation(conversationId))).data;
    }
  });
