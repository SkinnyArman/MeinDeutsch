import { useMutation } from "@/libs/query";
import type { ExpressionPromptRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useAlltagGeneratePromptMutation = () => {
  return useMutation({
    mutationFn: async () => (await fetchJson<ExpressionPromptRecord>(API_PATHS.expressionsGenerate, { method: "POST" })).data
  });
};
