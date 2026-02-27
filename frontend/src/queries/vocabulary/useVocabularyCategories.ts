import { useQuery } from "@/libs/query";
import type { VocabularyCategoryRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useVocabularyCategoriesQuery = () => {
  return useQuery({
    queryKey: ["vocab", "categories"],
    queryFn: async () => (await fetchJson<VocabularyCategoryRecord[]>(API_PATHS.vocabularyCategories)).data
  });
};
