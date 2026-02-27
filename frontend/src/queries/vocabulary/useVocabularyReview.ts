import { useMutation, useQueryClient } from "@/libs/query";
import type { Paginated, VocabularyItemRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useVocabularyReviewMutation = (options: { category: () => string; page: () => number; pageSize: () => number }) => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ item, rating }: { item: VocabularyItemRecord; rating: 1 | 2 | 3 | 4 }) => {
      return (await fetchJson<VocabularyItemRecord>(API_PATHS.vocabularyReview(item.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating })
      })).data;
    },
    onSuccess: (updated) => {
      queryClient.setQueryData<Paginated<VocabularyItemRecord>>(
        ["vocab", "list", options.category(), options.page(), options.pageSize()],
        (current) => (current
          ? { ...current, items: current.items.map((item) => (item.id === updated.id ? updated : item)) }
          : current)
      );
      queryClient.setQueryData<Paginated<VocabularyItemRecord>>(["vocab", "all"], (current) => (current
        ? { ...current, items: current.items.map((item) => (item.id === updated.id ? updated : item)) }
        : current));
    }
  });
};
