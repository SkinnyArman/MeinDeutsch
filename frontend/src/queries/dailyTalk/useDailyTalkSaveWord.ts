import { useMutation } from "@/libs/query";
import type { SavedVocabularyPayload } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useDailyTalkSaveWordMutation = () => {
  return useMutation({
    mutationFn: async (payload: {
      word: string;
      description: string;
      examples: string[];
      category: string;
      sourceAnswerLogId?: number | null;
      sourceQuestionId?: number | null;
    }) => {
      return (await fetchJson<SavedVocabularyPayload>(API_PATHS.vocabulary, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      })).data;
    }
  });
};
