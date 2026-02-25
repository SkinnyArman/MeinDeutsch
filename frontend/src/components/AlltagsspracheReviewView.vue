<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref } from "vue";
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

interface ExpressionReviewScorePoint {
  score: number;
  at: string;
}

interface ExpressionReviewItemRecord {
  id: number;
  englishText: string;
  initialScore: number;
  lastScore: number;
  successCount: number;
  reviewAttemptCount: number;
  nextReviewAt: string;
  lastReviewedAt: string | null;
  status: "active" | "graduated";
  baselineNativeLikeVersion: string;
  baselineAlternatives: string[];
  baselineFeedback: string;
  scoreHistory: ExpressionReviewScorePoint[];
  createdAt: string;
  updatedAt: string;
}

interface ExpressionReviewListPayload {
  dueCount: number;
  items: ExpressionReviewItemRecord[];
}

interface ExpressionReviewAssessmentPayload {
  reviewItem: ExpressionReviewItemRecord;
  naturalnessScore: number;
  feedback: string;
}

const router = useRouter();
const baseUrl = inject<import("vue").Ref<string>>("baseUrl")?.value ?? "http://localhost:4000";
const loadingReview = ref(false);
const submitting = ref(false);
const reviewItems = ref<ExpressionReviewItemRecord[]>([]);
const reviewDueCount = ref(0);
const activeReviewItemId = ref<number | null>(null);
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);
const form = reactive({ userAnswerText: "" });
const latest = ref<{ naturalnessScore: number; feedback: string; nativeLikeVersion: string; alternatives: string[] } | null>(null);

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

const activeItem = computed(() => {
  if (activeReviewItemId.value === null) {
    return null;
  }
  return reviewItems.value.find((item) => item.id === activeReviewItemId.value) ?? null;
});

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

const loadReviewQueue = async (): Promise<void> => {
  loadingReview.value = true;
  try {
    const res = await authFetch(`${baseUrl}/api/expressions/review?limit=100`);
    const payload = await parseApiResponse<ExpressionReviewListPayload>(res);
    reviewItems.value = payload.data.items;
    reviewDueCount.value = payload.data.dueCount;
    if (!reviewItems.value.length) {
      activeReviewItemId.value = null;
      return;
    }
    if (!reviewItems.value.some((item) => item.id === activeReviewItemId.value)) {
      activeReviewItemId.value = reviewItems.value[0]?.id ?? null;
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not load review queue");
  } finally {
    loadingReview.value = false;
  }
};

const submitReviewAttempt = async (): Promise<void> => {
  const item = activeItem.value;
  if (!item) {
    setError("No due review item selected.");
    return;
  }
  if (!form.userAnswerText.trim()) {
    setError("Write your German answer first.");
    return;
  }

  submitting.value = true;
  try {
    const res = await authFetch(`${baseUrl}/api/expressions/review/${item.id}/attempt`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        userAnswerText: form.userAnswerText.trim()
      })
    });
    const payload = await parseApiResponse<ExpressionReviewAssessmentPayload>(res);
    latest.value = {
      naturalnessScore: payload.data.naturalnessScore,
      feedback: payload.data.feedback,
      nativeLikeVersion: item.baselineNativeLikeVersion,
      alternatives: item.baselineAlternatives
    };
    form.userAnswerText = "";
    setSuccess("Review attempt assessed.");
    await loadReviewQueue();
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not assess review attempt");
  } finally {
    submitting.value = false;
  }
};

const backToAlltag = (): void => {
  void router.push("/alltagssprache");
};

onMounted(() => {
  void loadReviewQueue();
});
</script>

<template>
  <section class="mx-auto w-full max-w-3xl space-y-6">
    <header class="flex items-start justify-between gap-3">
      <div>
        <h2 class="font-serif text-3xl font-semibold tracking-tight">Alltagssprache Review</h2>
        <p class="mt-1 text-xs text-[var(--muted)]">Practice expressions that need reinforcement.</p>
      </div>
      <button
        class="inline-flex items-center gap-1.5 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--accent)]"
        @click="backToAlltag"
      >
        Back
      </button>
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

    <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]">
      <div class="mb-2 flex items-center justify-between gap-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Due Review Queue</p>
        <div class="flex items-center gap-2">
          <span class="rounded-full border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-0.5 text-[10px]">{{ reviewDueCount }} due</span>
          <button
            class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-1 text-[10px] transition hover:border-[var(--accent)]"
            :disabled="loadingReview"
            @click="loadReviewQueue"
          >
            {{ loadingReview ? "..." : "Refresh" }}
          </button>
        </div>
      </div>
      <div v-if="!reviewItems.length" class="rounded-md border border-dashed border-[var(--line)] p-2.5 text-xs text-[var(--muted)]">
        Nothing due right now.
      </div>
      <div v-else class="space-y-1.5">
        <button
          v-for="item in reviewItems"
          :key="item.id"
          class="flex w-full items-center justify-between rounded-md border px-2 py-1.5 text-left text-xs transition"
          :class="activeReviewItemId === item.id
            ? 'border-[color-mix(in_srgb,var(--accent)_42%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_10%,var(--panel-soft))]'
            : 'border-[var(--line)] bg-[var(--panel-soft)] hover:border-[var(--accent)]'"
          @click="activeReviewItemId = item.id"
        >
          <span class="truncate pr-2">{{ item.englishText }}</span>
          <span class="shrink-0 text-[10px] text-[var(--muted)]">{{ item.lastScore }}%</span>
        </button>
      </div>
    </article>

    <article class="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_30%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_6%,var(--panel))] px-4 py-3">
      <div class="flex items-center justify-between gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
        <p>Review Expression</p>
      </div>
      <p class="mt-3 font-serif text-2xl leading-relaxed">
        {{ activeItem?.englishText ? `"${activeItem.englishText}"` : "Select a due review item." }}
      </p>
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
          :disabled="submitting || !activeItem"
          @click="submitReviewAttempt"
        >
          <svg class="h-4 w-4" viewBox="0 0 20 20" fill="none">
            <path d="m3 10 14-6-4 12-3-4-7-2Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.6" />
          </svg>
        </button>
      </div>
    </article>

    <section v-if="latest" class="space-y-2">
      <hr class="border-[var(--line)]" />
      <div class="grid gap-4 md:grid-cols-[1fr_auto]">
        <div class="space-y-3">
          <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Feedback</p>
            <p class="mt-2 text-sm text-[var(--muted)]">{{ latest.feedback || "Perfectly natural. No feedback needed." }}</p>
          </article>

          <article class="rounded-xl border border-[color-mix(in_srgb,var(--status-good)_30%,var(--line))] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Native-like Version</p>
            <p class="mt-2 rounded-md bg-[color-mix(in_srgb,var(--status-good)_10%,var(--panel-soft))] px-3 py-2 text-sm font-semibold">
              {{ latest.nativeLikeVersion }}
            </p>
          </article>

          <article v-if="latest.alternatives.length" class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Other Ways To Say It</p>
            <ul class="mt-2 space-y-1.5">
              <li v-for="(alt, idx) in latest.alternatives" :key="`alt-${idx}`" class="flex items-center gap-2 rounded-md bg-[var(--panel-soft)] px-2 py-1.5 text-xs">
                <span class="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[var(--line)] text-[10px] text-[var(--muted)]">{{ idx + 1 }}</span>
                <span>{{ alt }}</span>
              </li>
            </ul>
          </article>
        </div>

        <div class="flex items-center justify-center md:pt-3">
          <div class="flex flex-col items-center gap-2">
            <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel-soft))]">
              <span class="font-serif text-4xl font-bold leading-none" :class="scoreClass(latest.naturalnessScore)">
                {{ latest.naturalnessScore }}
              </span>
            </div>
            <div class="text-center">
              <p class="text-xs text-[var(--muted)]">Naturalness</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  </section>
</template>
