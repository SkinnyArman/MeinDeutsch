import { useInfiniteQuery } from "@/libs/query";
import type { CollocationAttemptRecord, Paginated } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";
import { ALLTAG_HISTORY_PAGE_SIZE } from "@/constants/app";

export const useCollocationHistoryInfiniteQuery = () => {
  return useInfiniteQuery<Paginated<CollocationAttemptRecord>, Error>({
    queryKey: ["collocations", "history"],
    initialPageParam: 0,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({
        limit: String(ALLTAG_HISTORY_PAGE_SIZE),
        offset: String(pageParam)
      });
      return (await fetchJson<Paginated<CollocationAttemptRecord>>(`${API_PATHS.collocationsHistory}?${params.toString()}`)).data;
    },
    getNextPageParam: (lastPage) => {
      const nextOffset = lastPage.offset + lastPage.items.length;
      return nextOffset < lastPage.total ? nextOffset : undefined;
    }
  });
};
