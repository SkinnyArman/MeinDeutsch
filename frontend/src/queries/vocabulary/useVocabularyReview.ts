import { useMutation, useQueryClient } from "@/libs/query";
import type {
  VocabularyItemRecord,
  VocabularyReviewRating
} from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useVocabularyReviewMutation = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ item, rating }: {
      item: VocabularyItemRecord;
      rating: VocabularyReviewRating;
    }) => {
      return (await fetchJson<VocabularyItemRecord>(API_PATHS.vocabularyReview(item.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rating })
      })).data;
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["vocab", "due"] }),
        queryClient.invalidateQueries({ queryKey: ["vocab", "list"] }),
        queryClient.invalidateQueries({ queryKey: ["vocab", "all"] })
      ]);
    }
  });
};
