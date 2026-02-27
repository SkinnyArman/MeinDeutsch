import { useMutation } from "@/libs/query";
import type { AnswerLogRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useDailyTalkSubmitMutation = () => {
  return useMutation({
    mutationFn: async (payload: { questionId: number; questionText: string; answerText: string }) => {
      return (await fetchJson<AnswerLogRecord>(API_PATHS.submissions, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })).data;
    }
  });
};
