import { useInfiniteQuery } from "@/libs/query";
import type { ExpressionAttemptRecord, Paginated } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";
import { ALLTAG_HISTORY_PAGE_SIZE } from "@/constants/app";

export const useAlltagHistoryInfiniteQuery = () => {
  return useInfiniteQuery({
    queryKey: ["expressions", "history"],
    queryFn: async ({ pageParam = 0 }) => {
      const params = new URLSearchParams({
        limit: String(ALLTAG_HISTORY_PAGE_SIZE),
        offset: String(pageParam)
      });
      return (await fetchJson<Paginated<ExpressionAttemptRecord>>(`${API_PATHS.expressionsHistory}?${params.toString()}`)).data;
    },
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    }
  });
};
