<script setup lang="ts">
import { inject, onMounted, reactive, ref } from "vue";
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
  naturalnessScore: number;
  feedback: string;
  nativeLikeVersion: string;
  alternatives: string[];
  createdAt: string;
}

const router = useRouter();
const baseUrl = inject<import("vue").Ref<string>>("baseUrl")?.value ?? "http://localhost:4000";
const loadingPrompt = ref(false);
const submitting = ref(false);
const loadingHistory = ref(false);
const prompt = ref<ExpressionPromptRecord | null>(null);
const latestAttempt = ref<ExpressionAttemptRecord | null>(null);
const history = ref<ExpressionAttemptRecord[]>([]);
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);
const expandedHistoryId = ref<number | null>(null);

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

const goToReview = (): void => {
  void router.push("/alltagssprache/review");
};

const formatDate = (value: string): string =>
  new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" });

const scoreLabel = (score: number): string => {
  if (score >= 80) {
    return "Very Natural";
  }
  if (score >= 60) {
    return "Good";
  }
  if (score >= 40) {
    return "Okay";
  }
  return "Needs Work";
};

const scoreClass = (score: number): string => {
  if (score >= 80) {
    return "text-[var(--status-good)]";
  }
  if (score >= 60) {
    return "text-[var(--accent)]";
  }
  if (score >= 40) {
    return "text-[color-mix(in_srgb,var(--accent)_65%,var(--status-bad))]";
  }
  return "text-[var(--status-bad)]";
};

const toggleHistoryItem = (id: number): void => {
  expandedHistoryId.value = expandedHistoryId.value === id ? null : id;
};

onMounted(() => {
  void loadHistory();
});
</script>

<template>
  <section class="mx-auto w-full max-w-3xl space-y-6">
    <header class="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 class="font-serif text-3xl font-semibold tracking-tight">Alltagssprache</h2>
        <p class="mt-1 text-xs text-[var(--muted)]">Translate everyday expressions naturally into German.</p>
      </div>
      <div class="flex items-center gap-2">
        <button
          class="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--accent)]"
          @click="goToReview"
        >
          <svg class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
            <path d="M4 4h12v12H4V4Zm3 3h6M7 10h6M7 13h4" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
          </svg>
          Review
        </button>
        <button
          class="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--accent)] disabled:opacity-60"
          :disabled="loadingPrompt"
          @click="generatePrompt"
        >
          <svg v-if="loadingPrompt" class="h-3.5 w-3.5 animate-spin" viewBox="0 0 20 20" fill="none">
            <circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-opacity="0.25" stroke-width="1.6" />
            <path d="M10 3.5a6.5 6.5 0 0 1 6.5 6.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.8" />
          </svg>
          <svg v-else class="h-3.5 w-3.5" viewBox="0 0 20 20" fill="none">
            <path d="M10 4v12M4 10h12" stroke="currentColor" stroke-linecap="round" stroke-width="1.7" />
          </svg>
          {{ loadingPrompt ? "Generating..." : "New Expression" }}
        </button>
      </div>
    </header>

    <p
      v-if="notice"
      class="rounded-lg border px-3 py-2 text-xs"
      :class="notice.type === 'error'
        ? 'border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_14%,var(--panel))]'
        : 'border-[color-mix(in_srgb,var(--status-good)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))]'"
    >
      {{ notice.text }}
    </p>

    <article class="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_30%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_6%,var(--panel))] px-4 py-3">
      <div class="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        <p class="inline-flex items-center gap-1.5">
          <span class="inline-flex h-4 w-4 items-center justify-center rounded-full bg-[color-mix(in_srgb,var(--accent)_20%,var(--panel-soft))]">
            <svg viewBox="0 0 20 20" fill="none" class="h-3 w-3 text-[var(--accent)]">
              <path d="M10 3.5a6.5 6.5 0 0 0-6.5 6.5v5h13v-5A6.5 6.5 0 0 0 10 3.5Z" stroke="currentColor" stroke-width="1.5" />
            </svg>
          </span>
          Express In German
        </p>
        <span class="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-0.5">Preferences</span>
      </div>
      <p class="mt-3 font-serif text-2xl leading-relaxed">{{ prompt?.englishText ? `"${prompt.englishText}"` : "Click New Expression to start." }}</p>
    </article>

    <article class="space-y-2">
      <p class="text-sm text-[var(--muted)]">How would you say this in German?</p>
      <div class="relative">
        <textarea
          v-model="form.userAnswerText"
          rows="3"
          class="min-h-[120px] w-full resize-none rounded-xl border border-[var(--line)] bg-[var(--panel)] px-4 py-3 pr-16 text-base outline-none transition focus:border-[var(--accent)]"
          placeholder="Schreib deine Antwort hier..."
        />
        <button
          class="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-lg bg-[color-mix(in_srgb,var(--accent)_82%,var(--panel-soft))] text-[var(--accent-contrast)] transition hover:opacity-90 disabled:opacity-60"
          :disabled="submitting"
          @click="submitAttempt"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
            <path d="m3 10 14-6-4 12-3-4-7-2Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.6" />
          </svg>
        </button>
      </div>
    </article>

    <section v-if="latestAttempt" class="space-y-2">
      <hr class="border-[var(--line)]" />
      <div class="grid gap-4 md:grid-cols-[1fr_auto]">
        <div class="space-y-3">
          <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Feedback</p>
            <p class="mt-2 text-sm text-[var(--muted)]">{{ latestAttempt.feedback }}</p>
          </article>

          <article class="rounded-xl border border-[color-mix(in_srgb,var(--status-good)_30%,var(--line))] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Native-like Version</p>
            <p class="mt-2 rounded-md bg-[color-mix(in_srgb,var(--status-good)_10%,var(--panel-soft))] px-3 py-2 text-sm font-semibold">
              {{ latestAttempt.nativeLikeVersion }}
            </p>
          </article>

          <article v-if="latestAttempt.alternatives.length" class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Other Ways To Say It</p>
            <ul class="mt-2 space-y-1.5">
              <li v-for="(alt, idx) in latestAttempt.alternatives" :key="`alt-${idx}`" class="flex items-center gap-2 rounded-md bg-[var(--panel-soft)] px-2 py-1.5 text-xs">
                <span class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--line)] text-[10px] text-[var(--muted)]">{{ idx + 1 }}</span>
                <span>{{ alt }}</span>
              </li>
            </ul>
          </article>
        </div>

        <div class="flex items-center justify-center md:pt-3">
          <div class="flex flex-col items-center gap-2">
            <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel-soft))]">
              <span class="font-serif text-4xl font-bold leading-none" :class="scoreClass(latestAttempt.naturalnessScore)">
                {{ latestAttempt.naturalnessScore }}
              </span>
            </div>
            <div class="text-center">
              <p class="text-sm font-semibold" :class="scoreClass(latestAttempt.naturalnessScore)">{{ scoreLabel(latestAttempt.naturalnessScore) }}</p>
              <p class="text-xs text-[var(--muted)]">Naturalness</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <hr class="border-[var(--line)]" />
    <section class="space-y-2">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">History</p>
        <button
          class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-1 text-xs transition hover:border-[var(--accent)]"
          :disabled="loadingHistory"
          @click="loadHistory"
        >
          {{ loadingHistory ? "Refreshing..." : "Refresh" }}
        </button>
      </div>
      <div v-if="!history.length && !loadingHistory" class="rounded-md border border-dashed border-[var(--line)] p-3 text-xs text-[var(--muted)]">
        No Alltagssprache attempts yet.
      </div>
      <ul v-else class="space-y-1.5">
        <li
          v-for="item in history"
          :key="item.id"
          class="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2.5 transition-all duration-200"
          :class="expandedHistoryId === item.id
            ? 'border-[color-mix(in_srgb,var(--line)_90%,transparent)] bg-[color-mix(in_srgb,var(--panel-soft)_68%,var(--panel))]'
            : 'hover:bg-[var(--panel-soft)]'"
        >
          <button class="w-full text-left" type="button" @click="toggleHistoryItem(item.id)">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">{{ `"${item.englishText}"` }}</p>
                <div class="mt-1 grid gap-x-4 gap-y-1 md:grid-cols-2">
                  <p class="truncate text-xs text-[var(--muted)]">You: {{ item.userAnswerText }}</p>
                  <p class="truncate text-xs text-[var(--muted)]">Native: {{ item.nativeLikeVersion }}</p>
                </div>
              </div>
              <div class="shrink-0 text-right md:flex md:items-center md:gap-3">
                <p class="text-xs font-semibold" :class="scoreClass(item.naturalnessScore)">
                  {{ item.naturalnessScore }}%
                </p>
                <p class="text-[10px] text-[var(--muted)]">{{ formatDate(item.createdAt) }}</p>
                <svg
                  class="ml-2 h-3.5 w-3.5 text-[var(--muted)] transition"
                  :class="expandedHistoryId === item.id ? 'rotate-180' : ''"
                  viewBox="0 0 20 20"
                  fill="none"
                >
                  <path d="m5.5 7.5 4.5 5 4.5-5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.6" />
                </svg>
              </div>
            </div>
          </button>

          <div
            class="grid transition-all duration-300 ease-out"
            :style="{ gridTemplateRows: expandedHistoryId === item.id ? '1fr' : '0fr' }"
          >
            <div class="overflow-hidden">
              <div
                class="mt-3 space-y-2 rounded-lg border border-[color-mix(in_srgb,var(--line)_92%,transparent)] bg-[color-mix(in_srgb,var(--panel)_90%,var(--panel-soft))] p-3 transition-opacity duration-200"
                :class="expandedHistoryId === item.id ? 'opacity-100' : 'opacity-0'"
              >
                <div class="min-w-0 border-l-2 border-[color-mix(in_srgb,var(--accent)_45%,transparent)] pl-2.5">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Feedback</p>
                  <p class="mt-1 text-xs text-[var(--muted)]">{{ item.feedback }}</p>
                </div>

                <div v-if="item.alternatives.length" class="space-y-1">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">Alternatives</p>
                  <ul class="space-y-1">
                    <li
                      v-for="(alt, idx) in item.alternatives"
                      :key="`history-alt-${item.id}-${idx}`"
                      class="rounded-md bg-[var(--panel)] px-2 py-1.5 text-xs"
                    >
                      <span class="text-[var(--muted)]">{{ idx + 1 }}.</span>
                      {{ alt }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </li>
      </ul>
    </section>
  </section>
</template>
