import { computed } from "vue";
import { useQuery } from "@/libs/query";
import type { AnswerLogRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useDailyTalkDetailQuery = (options: { id: () => number }) => {
  return useQuery({
    queryKey: computed(() => ["daily-talk", "detail", options.id()]),
    enabled: computed(() => Number.isFinite(options.id()) && options.id() > 0),
    queryFn: async () => (await fetchJson<AnswerLogRecord>(API_PATHS.submissionDetail(options.id()))).data
  });
};
