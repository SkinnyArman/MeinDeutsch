import { computed } from "vue";
import { useQuery } from "@/libs/query";
import type { Paginated, VocabularyItemRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useDailyTalkSavedVocabQuery = (options: { answerLogId: () => number | null }) => {
  return useQuery({
    queryKey: computed(() => ["vocab", "saved", options.answerLogId() ?? 0]),
    enabled: computed(() => Boolean(options.answerLogId())),
    queryFn: async () => {
      const query = new URLSearchParams({ sourceAnswerLogId: String(options.answerLogId() ?? "") });
      return (await fetchJson<Paginated<VocabularyItemRecord>>(`${API_PATHS.vocabulary}?${query.toString()}`)).data;
    }
  });
};
