import { useMutation } from "@/libs/query";
import type { ExpressionPromptRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";
import type { AlltagCategory } from "./useAlltagPrompt";

export const useAlltagNextPromptMutation = () => {
  return useMutation({
    mutationFn: async (payload: { category: AlltagCategory }) =>
      (
        await fetchJson<ExpressionPromptRecord>(API_PATHS.expressionsNext, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      ).data
  });
};
