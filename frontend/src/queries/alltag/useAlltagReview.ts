import { useQuery } from "@/libs/query";
import type { ExpressionReviewListPayload } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useAlltagReviewQuery = () => {
  return useQuery({
    queryKey: ["expressions", "review"],
    queryFn: async () => (await fetchJson<ExpressionReviewListPayload>(`${API_PATHS.expressionsReview}?limit=100`)).data
  });
};
