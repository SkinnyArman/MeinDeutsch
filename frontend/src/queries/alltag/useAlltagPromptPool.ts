import { useMutation } from "@/libs/query";
import type { ExpressionPromptPoolPayload } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";
import type { AlltagCategory } from "./useAlltagPrompt";

export const useAlltagPromptPoolMutation = () => {
  return useMutation({
    mutationFn: async (payload: { categories: AlltagCategory[]; countPerCategory?: number }) =>
      (
        await fetchJson<ExpressionPromptPoolPayload>(API_PATHS.expressionsPool, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      ).data
  });
};
