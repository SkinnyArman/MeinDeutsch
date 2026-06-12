import { useQuery } from "@/libs/query";
import type { CollocationReviewListPayload } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useCollocationReviewQuery = () => {
  return useQuery({
    queryKey: ["collocations", "review"],
    queryFn: async () => (await fetchJson<CollocationReviewListPayload>(`${API_PATHS.collocationsReview}?limit=100`)).data
  });
};
