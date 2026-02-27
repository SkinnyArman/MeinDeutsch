import { computed } from "vue";
import { useQuery } from "@/libs/query";
import type { KnowledgeItemRecord, TopicRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useKnowledgeTopicsQuery = () => {
  return useQuery({
    queryKey: ["topics"],
    queryFn: async () => (await fetchJson<TopicRecord[]>(API_PATHS.topics)).data
  });
};

export const useKnowledgeQuery = (options: { topicId: () => string; limit: () => string }) => {
  return useQuery({
    queryKey: computed(() => ["knowledge", options.topicId(), options.limit()]),
    queryFn: async () => {
      const params = new URLSearchParams();
      if (options.topicId().trim()) {
        params.set("topicId", options.topicId().trim());
      }
      if (options.limit().trim()) {
        params.set("limit", options.limit().trim());
      }
      const q = params.toString();
      const url = q ? `${API_PATHS.knowledge}?${q}` : API_PATHS.knowledge;
      return (await fetchJson<KnowledgeItemRecord[]>(url)).data;
    }
  });
};
