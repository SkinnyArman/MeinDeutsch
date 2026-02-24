<script setup lang="ts">
import { inject, onMounted, reactive, ref } from "vue";
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

interface ExpressionPromptRecord {
  id: number;
  englishText: string;
  generatedContext: string | null;
  createdAt: string;
}

interface ExpressionAttemptRecord {
  id: number;
  promptId: number;
  englishText: string;
  userAnswerText: string;
  isSemanticallyCorrect: boolean;
  isNaturalGerman: boolean;
  feedback: string;
  nativeLikeVersion: string;
  alternatives: string[];
  createdAt: string;
}

const baseUrl = inject<import("vue").Ref<string>>("baseUrl")?.value ?? "http://localhost:4000";
const loadingPrompt = ref(false);
const submitting = ref(false);
const loadingHistory = ref(false);
const prompt = ref<ExpressionPromptRecord | null>(null);
const latestAttempt = ref<ExpressionAttemptRecord | null>(null);
const history = ref<ExpressionAttemptRecord[]>([]);
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);

const form = reactive({
  userAnswerText: ""
});

const setError = (text: string): void => {
  notice.value = { type: "error", text };
};

const setSuccess = (text: string): void => {
  notice.value = { type: "success", text };
};

const parseApiResponse = async <T>(res: Response): Promise<ApiResponse<T>> => {
  const payload = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !payload.success || payload.data === null) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
};

const loadHistory = async (): Promise<void> => {
  loadingHistory.value = true;
  try {
    const res = await authFetch(`${baseUrl}/api/expressions/history?limit=30`);
    const payload = await parseApiResponse<ExpressionAttemptRecord[]>(res);
    history.value = payload.data;
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not load history");
  } finally {
    loadingHistory.value = false;
  }
};

const generatePrompt = async (): Promise<void> => {
  loadingPrompt.value = true;
  latestAttempt.value = null;
  try {
    const res = await authFetch(`${baseUrl}/api/expressions/generate`, {
      method: "POST"
    });
    const payload = await parseApiResponse<ExpressionPromptRecord>(res);
    prompt.value = payload.data;
    form.userAnswerText = "";
    setSuccess("New expression generated.");
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not generate expression");
  } finally {
    loadingPrompt.value = false;
  }
};

const submitAttempt = async (): Promise<void> => {
  if (!prompt.value) {
    setError("Generate an expression first.");
    return;
  }
  if (!form.userAnswerText.trim()) {
    setError("Write your German answer first.");
    return;
  }

  submitting.value = true;
  try {
    const res = await authFetch(`${baseUrl}/api/expressions/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        promptId: prompt.value.id,
        userAnswerText: form.userAnswerText.trim()
      })
    });
    const payload = await parseApiResponse<ExpressionAttemptRecord>(res);
    latestAttempt.value = payload.data;
    setSuccess("Answer assessed.");
    await loadHistory();
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not assess answer");
  } finally {
    submitting.value = false;
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
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,color-mix(in_srgb,var(--accent)_20%,transparent)_0%,transparent_45%)] opacity-60"></div>
      <div class="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight">Alltagssprache</h2>
          <p class="mt-1 text-sm text-[var(--muted)]">Translate common everyday English expressions into natural German.</p>
        </div>
        <button
          class="rounded-md bg-[var(--accent)] px-4 py-2 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          :disabled="loadingPrompt"
          @click="generatePrompt"
        >
          {{ loadingPrompt ? "Generating..." : "Generate" }}
        </button>
      </div>
    </header>

    <p
      v-if="notice"
      class="rounded-lg border px-3 py-2 text-sm"
      :class="notice.type === 'error'
        ? 'border-[color-mix(in_srgb,var(--status-bad)_50%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_14%,var(--panel))]'
        : 'border-[color-mix(in_srgb,var(--status-good)_50%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))]'"
    >
      {{ notice.text }}
    </p>

    <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">English Expression</p>
      <p class="mt-2 text-lg">{{ prompt?.englishText ?? "Click Generate to start." }}</p>
      <textarea
        v-model="form.userAnswerText"
        rows="4"
        class="mt-4 w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        placeholder="Write how you'd say this in German..."
      />
      <button
        class="mt-3 w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-contrast)] transition disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="submitting"
        @click="submitAttempt"
      >
        {{ submitting ? "Checking..." : "Check answer" }}
      </button>
    </article>

    <article v-if="latestAttempt" class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Assessment</p>
      <div class="mt-3 grid gap-3 md:grid-cols-2">
        <div class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-3">
          <p class="text-xs text-[var(--muted)]">Semantically Correct</p>
          <p class="text-lg font-semibold">{{ latestAttempt.isSemanticallyCorrect ? "Yes" : "No" }}</p>
        </div>
        <div class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-3">
          <p class="text-xs text-[var(--muted)]">Natural German</p>
          <p class="text-lg font-semibold">{{ latestAttempt.isNaturalGerman ? "Yes" : "No" }}</p>
        </div>
      </div>
      <p class="mt-3 text-sm"><span class="font-semibold">Feedback:</span> {{ latestAttempt.feedback }}</p>
      <p class="mt-2 text-sm"><span class="font-semibold">Native way:</span> {{ latestAttempt.nativeLikeVersion }}</p>
      <div v-if="latestAttempt.alternatives.length" class="mt-2 text-sm">
        <p class="font-semibold">Alternatives:</p>
        <ul class="mt-1 space-y-1">
          <li v-for="(alt, idx) in latestAttempt.alternatives" :key="`alt-${idx}`">{{ alt }}</li>
        </ul>
      </div>
    </article>

    <section class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-lg font-semibold">History</h3>
        <button
          class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-1.5 text-sm transition hover:border-[var(--accent)]"
          :disabled="loadingHistory"
          @click="loadHistory"
        >
          {{ loadingHistory ? "Refreshing..." : "Refresh" }}
        </button>
      </div>
      <div v-if="!history.length && !loadingHistory" class="rounded-md border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
        No Alltagssprache attempts yet.
      </div>
      <ul v-else class="space-y-2">
        <li v-for="item in history" :key="item.id" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-3">
          <p class="text-sm font-semibold">{{ item.englishText }}</p>
          <p class="mt-1 text-xs text-[var(--muted)]">Your answer: {{ item.userAnswerText }}</p>
          <p class="mt-1 text-xs text-[var(--muted)]">{{ formatDate(item.createdAt) }}</p>
        </li>
      </ul>
    </section>
  </section>
</template>
