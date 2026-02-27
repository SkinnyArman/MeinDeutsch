import { useMutation } from "@/libs/query";
import type { ExpressionReviewAssessmentPayload } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useAlltagReviewAttemptMutation = () => {
  return useMutation({
    mutationFn: async (payload: { reviewItemId: number; userAnswerText: string }) => {
      return (await fetchJson<ExpressionReviewAssessmentPayload>(API_PATHS.expressionsReviewAttempt(payload.reviewItemId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAnswerText: payload.userAnswerText })
      })).data;
    }
  });
};
