import { useQuery } from "@/libs/query";
import type { CollocationCategoryRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useCollocationCategoriesQuery = () => {
  return useQuery({
    queryKey: ["collocations", "categories"],
    queryFn: async () =>
      (await fetchJson<CollocationCategoryRecord[]>(API_PATHS.collocationsCategories)).data
  });
};
