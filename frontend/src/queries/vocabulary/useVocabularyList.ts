import { computed } from "vue";
import { useQuery } from "@/libs/query";
import type { Paginated, VocabularyItemRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";
import { DEFAULT_PAGE_SIZE } from "@/constants/app";

export const useVocabularyListQuery = (options: { category: () => string; page: () => number; pageSize?: number }) => {
  const pageSize = computed(() => options.pageSize ?? DEFAULT_PAGE_SIZE);
  return useQuery({
    queryKey: computed(() => ["vocab", "list", options.category(), options.page(), pageSize.value]),
    enabled: computed(() => Boolean(options.category())),
    queryFn: async () => {
      const params = new URLSearchParams({
        limit: String(pageSize.value),
        offset: String((options.page() - 1) * pageSize.value)
      });
      if (options.category()) {
        params.set("category", options.category());
      }
      return (await fetchJson<Paginated<VocabularyItemRecord>>(`${API_PATHS.vocabulary}?${params.toString()}`)).data;
    }
  });
};
