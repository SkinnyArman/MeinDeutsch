import { useQuery } from "@/libs/query";
import type { TopicRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useDailyTalkTopicsQuery = () => {
  return useQuery({
    queryKey: ["topics"],
    queryFn: async () => (await fetchJson<TopicRecord[]>(API_PATHS.topics)).data
  });
};
