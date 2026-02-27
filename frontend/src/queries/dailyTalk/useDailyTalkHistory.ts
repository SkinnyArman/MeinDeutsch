import { computed } from "vue";
import { useQuery } from "@/libs/query";
import type { AnswerLogRecord, Paginated } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";
import { DEFAULT_PAGE_SIZE } from "@/constants/app";

export const useDailyTalkHistoryQuery = (options: { page: () => number; pageSize?: number }) => {
  const pageSize = computed(() => options.pageSize ?? DEFAULT_PAGE_SIZE);
  return useQuery({
    queryKey: computed(() => ["daily-talk", "history", options.page(), pageSize.value]),
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(pageSize.value),
        offset: String((options.page() - 1) * pageSize.value)
      });
      return (await fetchJson<Paginated<AnswerLogRecord>>(`${API_PATHS.submissions}?${params.toString()}`)).data;
    }
  });
};
