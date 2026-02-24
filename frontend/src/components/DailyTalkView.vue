<script setup lang="ts">
import { inject, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { authFetch } from "../utils/auth";

interface ApiErrorBody {
  code: string;
  details?: unknown;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: ApiErrorBody | null;
}

interface AnalysisError {
  type: string;
  message: string;
  description: string;
  evidence: string;
  correction: string;
  start: number | null;
  end: number | null;
  severity: number;
}

interface ContextualWordSuggestion {
  word: string;
  description: string;
  examples: string[];
}

interface AnswerLogRecord {
  id: number;
  questionId: number | null;
  topicId?: number | null;
  topicName?: string;
  questionText: string;
  answerText: string;
  correctedText: string;
  cefrLevel: string;
  errorTypes: AnalysisError[];
  tips: string[];
  contextualWordSuggestions: ContextualWordSuggestion[];
  modelUsed: string;
  createdAt: string;
}

type Notice = {
  type: "success" | "error";
  text: string;
};

const baseUrl = inject<import("vue").Ref<string>>("baseUrl")?.value ?? "http://localhost:4000";
const router = useRouter();

const loadingHistory = ref(false);
const historyNotice = ref<Notice | null>(null);
const history = ref<AnswerLogRecord[]>([]);

const setHistoryNotice = (type: "success" | "error", text: string): void => {
  historyNotice.value = { type, text };
};

const parseApiResponse = async <T>(res: Response): Promise<ApiResponse<T>> => {
  const payload = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
};

const loadHistory = async (): Promise<void> => {
  loadingHistory.value = true;
  try {
    const res = await authFetch(`${baseUrl}/api/submissions?limit=50`);
    const payload = await parseApiResponse<AnswerLogRecord[]>(res);
    history.value = payload.data;
    setHistoryNotice("success", `Loaded ${payload.data.length} submissions.`);
  } catch (error) {
    setHistoryNotice("error", error instanceof Error ? error.message : "Could not load submissions");
  } finally {
    loadingHistory.value = false;
  }
};

const formatDate = (value: string): string => new Date(value).toLocaleString();

onMounted(() => {
  void loadHistory();
});
</script>

<template>
  <section class="space-y-4">
    <header class="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--surface-shadow)]">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,color-mix(in_srgb,var(--accent)_20%,transparent)_0%,transparent_45%)] opacity-60"></div>
      <div class="relative flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight">Daily Talk</h2>
          <p class="mt-1 text-sm text-[var(--muted)]">Review your past answers or start a new question.</p>
        </div>
        <button
          class="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-contrast)] transition hover:opacity-90"
          @click="router.push('/daily-talk/new')"
        >
          New
        </button>
      </div>
    </header>

    <section class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold">Past Daily Talks</h3>
          <p class="text-xs text-[var(--muted)]">Click a question to open the full detail page.</p>
        </div>
        <button
          class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-1 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
          :disabled="loadingHistory"
          @click="loadHistory"
        >
          {{ loadingHistory ? "Refreshing..." : "Refresh" }}
        </button>
      </div>

      <p v-if="historyNotice" class="mb-3 rounded-lg border px-3 py-2 text-sm"
        :class="historyNotice.type === 'error'
          ? 'border-[color-mix(in_srgb,var(--status-bad)_50%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_14%,var(--panel))]'
          : 'border-[color-mix(in_srgb,var(--status-good)_50%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))]'
        "
      >
        {{ historyNotice.text }}
      </p>

      <div v-if="!history.length && !loadingHistory" class="rounded-md border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
        No Daily Talk submissions yet.
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="item in history"
          :key="item.id"
          class="cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-3 transition hover:border-[var(--accent)]"
          @click="router.push(`/daily-talk/${item.id}`)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold">{{ item.questionText }}</p>
              <p class="mt-1 text-xs text-[var(--muted)]">{{ formatDate(item.createdAt) }}</p>
              <p class="mt-1 text-xs text-[var(--muted)]">{{ item.topicName ?? "General" }} · CEFR {{ item.cefrLevel }}</p>
            </div>
            <span class="rounded border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_16%,var(--panel-soft))] px-2 py-1 text-xs text-[var(--accent)]">
              #{{ item.id }}
            </span>
          </div>
        </li>
      </ul>
    </section>
  </section>
</template>
