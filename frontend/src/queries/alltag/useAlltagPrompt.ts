import { useMutation } from "@/libs/query";
import type { ExpressionPromptRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export type AlltagCategory = string;

export const useAlltagGeneratePromptMutation = () => {
  return useMutation({
    mutationFn: async (payload: { category: AlltagCategory }) =>
      (
        await fetchJson<ExpressionPromptRecord>(API_PATHS.expressionsGenerate, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      ).data
  });
};
