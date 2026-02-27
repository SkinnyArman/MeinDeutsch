import { useMutation } from "@/libs/query";
import type { ExpressionAttemptRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useAlltagAttemptMutation = () => {
  return useMutation({
    mutationFn: async (payload: { promptId: number; userAnswerText: string }) => {
      return (await fetchJson<ExpressionAttemptRecord>(API_PATHS.expressionsAttempt, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })).data;
    }
  });
};
