import { useMutation } from "@/libs/query";
import type { CollocationAttemptRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useCollocationAttemptMutation = () => {
  return useMutation({
    mutationFn: async (payload: { promptId: number; userAnswerText: string }) => {
      return (await fetchJson<CollocationAttemptRecord>(API_PATHS.collocationsAttempt, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })).data;
    }
  });
};
