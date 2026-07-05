import { useMutation, useQuery } from "@/libs/query";
import type { LevelExamPayload, UserLevelState } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

export const useLevelQuery = () =>
  useQuery({
    queryKey: ["level"],
    queryFn: async () => (await fetchJson<UserLevelState>(API_PATHS.level)).data
  });

export const useLevelExamQuery = () =>
  useQuery({
    queryKey: ["level", "exam"],
    queryFn: async () => (await fetchJson<LevelExamPayload>(API_PATHS.levelExam)).data,
    refetchOnWindowFocus: false,
    staleTime: Infinity
  });

export const useAssessLevelMutation = () =>
  useMutation({
    mutationFn: async (payload: {
      selfEstimate: string;
      answers: Array<{ questionId: string; selectedOptionId: string }>;
      writingAnswer: string;
    }) =>
      (
        await fetchJson<UserLevelState>(API_PATHS.levelAssess, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      ).data
  });

export const useSetLevelMutation = () =>
  useMutation({
    mutationFn: async (payload: { cefrLevel: string }) =>
      (
        await fetchJson<UserLevelState>(API_PATHS.level, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload)
        })
      ).data
  });
