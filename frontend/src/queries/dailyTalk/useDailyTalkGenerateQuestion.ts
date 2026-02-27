import { useMutation } from "@/libs/query";
import type { QuestionRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useDailyTalkGenerateQuestionMutation = () => {
  return useMutation({
    mutationFn: async (payload: { topicId: number; cefrTarget?: string }) => {
      return (await fetchJson<QuestionRecord>(API_PATHS.questionsGenerate, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })).data;
    }
  });
};
