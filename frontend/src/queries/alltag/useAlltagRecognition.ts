import { useMutation } from "@/libs/query";
import type { ExpressionRecognitionResult } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useAlltagRecognitionMutation = () => {
  return useMutation({
    mutationFn: async (payload: { promptId: number; chosenText: string }) =>
      (
        await fetchJson<ExpressionRecognitionResult>(API_PATHS.expressionsRecognition, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      ).data
  });
};
