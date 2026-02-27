import { ref } from "vue";

const API_BASE_URL_STORAGE_KEY = "meindeutsch_api_base_url";
const DEFAULT_API_BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";

export const apiBaseUrl = ref<string>(DEFAULT_API_BASE_URL);

if (typeof window !== "undefined") {
  const stored = window.localStorage.getItem(API_BASE_URL_STORAGE_KEY);
  if (stored) {
    apiBaseUrl.value = stored;
  }
}

export const setApiBaseUrl = (value: string): void => {
  apiBaseUrl.value = value;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(API_BASE_URL_STORAGE_KEY, value);
  }
};

export const apiUrl = (path: string): string => {
  if (path.startsWith("http")) {
    return path;
  }
  return `${apiBaseUrl.value.replace(/\/$/, "")}${path.startsWith("/") ? "" : "/"}${path}`;
};

export const API_PATHS = {
  authGoogle: "/api/auth/google",
  submissions: "/api/submissions",
  submissionDetail: (id: number) => `/api/submissions/${id}`,
  topics: "/api/topics",
  questionsGenerate: "/api/questions/generate",
  vocabulary: "/api/vocabulary",
  vocabularyCategories: "/api/vocabulary/categories",
  vocabularyReview: (id: number) => `/api/vocabulary/${id}/review`,
  expressionsGenerate: "/api/expressions/generate",
  expressionsAttempt: "/api/expressions/attempt",
  expressionsHistory: "/api/expressions/history",
  expressionsReview: "/api/expressions/review",
  expressionsReviewAttempt: (id: number) => `/api/expressions/review/${id}/attempt`,
  knowledge: "/api/knowledge",
  streakDailyTalk: "/api/streaks/daily-talk"
} as const;
