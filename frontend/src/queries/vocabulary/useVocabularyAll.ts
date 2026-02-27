import { useQuery } from "@/libs/query";
import type { Paginated, VocabularyItemRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";
import { VOCAB_STATS_LIMIT } from "@/constants/app";

export const useVocabularyAllQuery = () => {
  return useQuery({
    queryKey: ["vocab", "all"],
    queryFn: async () => {
      const params = new URLSearchParams({ limit: String(VOCAB_STATS_LIMIT) });
      return (await fetchJson<Paginated<VocabularyItemRecord>>(`${API_PATHS.vocabulary}?${params.toString()}`)).data;
    }
  });
};
