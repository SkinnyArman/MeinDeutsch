import { useQuery } from "@/libs/query";
import type { ExpressionCategoryRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useAlltagCategoriesQuery = () => {
  return useQuery({
    queryKey: ["alltag", "categories"],
    queryFn: async () =>
      (
        await fetchJson<ExpressionCategoryRecord[]>(API_PATHS.expressionsCategories)
      ).data
  });
};

