import { useQuery } from "@/libs/query";
import type { ProgressOverview } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useProgressQuery = () =>
  useQuery({
    queryKey: ["progress"],
    queryFn: async () => (await fetchJson<ProgressOverview>(API_PATHS.progress)).data
  });
