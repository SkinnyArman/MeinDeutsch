import { useMutation, useQuery, useQueryClient } from "@/libs/query";
import type { TopicRecord } from "@/types/ApiTypes";
import { fetchJson, fetchJsonNullable } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useTopicsQuery = () => {
  return useQuery({
    queryKey: ["topics"],
    queryFn: async () => (await fetchJson<TopicRecord[]>(API_PATHS.topics)).data
  });
};

export const useCreateTopicMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { name: string; description?: string }) => {
      return (await fetchJson<TopicRecord>(API_PATHS.topics, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })).data;
    },
    onSuccess: (topic) => {
      queryClient.setQueryData<TopicRecord[]>(["topics"], (current) => (current ? [topic, ...current] : [topic]));
    }
  });
};

export const useDeleteTopicMutation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (topicId: number) => {
      await fetchJsonNullable<null>(`${API_PATHS.topics}/${topicId}`, { method: "DELETE" });
      return topicId;
    },
    onSuccess: (topicId) => {
      queryClient.setQueryData<TopicRecord[]>(["topics"], (current) => current?.filter((topic) => topic.id !== topicId) ?? []);
    }
  });
};
