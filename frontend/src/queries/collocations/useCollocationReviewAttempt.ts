import { useMutation } from "@/libs/query";
import type { CollocationReviewAssessmentPayload } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useCollocationReviewAttemptMutation = () => {
  return useMutation({
    mutationFn: async (payload: { reviewItemId: number; userAnswerText: string }) => {
      return (await fetchJson<CollocationReviewAssessmentPayload>(API_PATHS.collocationsReviewAttempt(payload.reviewItemId), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userAnswerText: payload.userAnswerText })
      })).data;
    }
  });
};
