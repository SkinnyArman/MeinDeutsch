import { useMutation } from "@/libs/query";
import type { CollocationPromptRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export type CollocationCategory = string;

export const useCollocationNextPromptMutation = () => {
  return useMutation({
    mutationFn: async (payload: { category: CollocationCategory }) =>
      (
        await fetchJson<CollocationPromptRecord>(API_PATHS.collocationsNext, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      ).data
  });
};
