import { useQuery } from "@/libs/query";
import type { VocabularyReviewQueuePayload } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useVocabularyDueQuery = (limit = 20) => {
  return useQuery({
    queryKey: ["vocab", "due", limit],
    refetchInterval: 60_000,
    refetchOnWindowFocus: true,
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(limit) });
      return (await fetchJson<VocabularyReviewQueuePayload>(
        `${API_PATHS.vocabularyDue}?${params.toString()}`
      )).data;
    }
  });
};
