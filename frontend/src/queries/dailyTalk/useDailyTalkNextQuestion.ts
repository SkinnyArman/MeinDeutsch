import { useMutation } from "@/libs/query";
import type { QuestionRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useDailyTalkNextQuestionMutation = () => {
  return useMutation({
    mutationFn: async (payload: { topicId?: number }) => {
      return (await fetchJson<QuestionRecord>(API_PATHS.questionsNext, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })).data;
    }
  });
};
