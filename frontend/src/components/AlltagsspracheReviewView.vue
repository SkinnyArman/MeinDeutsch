<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import { CheckCircle2, ClipboardCheck, Loader2, Sparkles } from "lucide-vue-next";
import AppContainer from "./AppContainer.vue";
import { useAlltagReviewAttemptMutation, useAlltagReviewQuery } from "@/queries/alltag";

const router = useRouter();
const { t } = useLanguage();
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);
const form = reactive({ userAnswerText: "" });
const latest = ref<{ naturalnessScore: number; feedback: string } | null>(null);
const latestExpression = ref<string | null>(null);
const completedReviewIds = ref<Set<number>>(new Set());

const reviewQuery = useAlltagReviewQuery();
const assessMutation = useAlltagReviewAttemptMutation();

const reviewItems = computed(() => reviewQuery.data.value?.items ?? []);
const activeReviewItemId = ref<number | null>(null);

const activeItem = computed(() => {
  if (activeReviewItemId.value === null) {
    return null;
  }
  return reviewItems.value.find((item) => item.id === activeReviewItemId.value) ?? null;
});

const isLockedForActive = computed(() => {
  if (!activeItem.value) {
    return false;
  }
  return completedReviewIds.value.has(activeItem.value.id);
});

watchEffect(() => {
  if (reviewQuery.error.value) {
    notice.value = { type: "error", text: reviewQuery.error.value.message };
  }
  if (assessMutation.error.value) {
    notice.value = { type: "error", text: assessMutation.error.value.message };
  }
});

watchEffect(() => {
  if (!activeReviewItemId.value && reviewItems.value.length) {
    activeReviewItemId.value = reviewItems.value[0]?.id ?? null;
  }
});

const submitReviewAttempt = async (): Promise<void> => {
  if (!activeItem.value) {
    notice.value = { type: "error", text: t.alltagReview.noDue() };
    return;
  }
  if (isLockedForActive.value) {
    return;
  }
  if (!form.userAnswerText.trim()) {
    notice.value = { type: "error", text: t.alltagReview.answerPrompt() };
    return;
  }

  const submittedId = activeItem.value.id;
  const data = await assessMutation.mutateAsync({
    reviewItemId: submittedId,
    userAnswerText: form.userAnswerText.trim()
  });
  latestExpression.value = activeItem.value.englishText;
  latest.value = { naturalnessScore: data.naturalnessScore, feedback: data.feedback };
  completedReviewIds.value.add(submittedId);
  form.userAnswerText = "";
  await reviewQuery.refetch();
  if (!reviewItems.value.some((item) => item.id === activeReviewItemId.value)) {
    activeReviewItemId.value = reviewItems.value[0]?.id ?? null;
  }
};
</script>

<template>
  <AppContainer size="sm">
    <section class="space-y-4">
      <header class="flex items-center justify-between">
        <div>
          <h1 class="font-serif text-2xl font-bold tracking-tight">{{ t.alltagReview.title() }}</h1>
          <p class="mt-1 text-sm text-[var(--muted)]">{{ t.alltagReview.title() }}</p>
        </div>
        <button
          class="rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs transition hover:border-[var(--accent)]"
          @click="router.push('/alltagssprache')"
        >
          {{ t.common.back() }}
        </button>
      </header>

      <p
        v-if="notice"
        class="rounded-lg border px-3 py-2 text-xs"
        :class="notice.type === 'error'
          ? 'border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_14%,var(--panel))]'
          : 'border-[color-mix(in_srgb,var(--status-good)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))]'
        "
      >
        {{ notice.text }}
      </p>

      <div v-if="!reviewItems.length && !reviewQuery.isFetching.value && !latest" class="rounded-xl border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel)_92%,white)] p-6 shadow-[var(--surface-shadow)]">
        <div class="mx-auto flex max-w-sm flex-col items-center text-center">
          <div class="mb-3 inline-flex h-10 w-10 items-center justify-center rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--panel-soft))]">
            <Sparkles class="h-5 w-5 text-[var(--accent)]" />
          </div>
          <p class="text-base font-semibold text-[var(--text)]">{{ t.alltagReview.noDueTitle() }}</p>
          <p class="mt-1 text-sm text-[var(--muted)]">{{ t.alltagReview.noDueHint() }}</p>
        </div>
      </div>

      <div v-if="reviewItems.length" class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <div class="flex items-center justify-between">
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.alltag.expressInGerman() }}</p>
            <p class="mt-2 font-serif text-xl">{{ activeItem?.englishText }}</p>
          </div>
          <ClipboardCheck class="h-5 w-5 text-[var(--muted)]" />
        </div>

        <div class="mt-4">
          <label class="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{{ t.alltagReview.answerPrompt() }}</label>
          <textarea
            v-model="form.userAnswerText"
            class="mt-2 min-h-[80px] w-full rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
            :placeholder="t.alltag.answerPlaceholder()"
            :disabled="isLockedForActive"
          />
        </div>

        <button
          class="mt-3 inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--accent)] disabled:opacity-60"
          :disabled="assessMutation.isPending.value || !form.userAnswerText.trim() || isLockedForActive"
          @click="submitReviewAttempt"
        >
          <Loader2 v-if="assessMutation.isPending.value" class="h-3.5 w-3.5 animate-spin" />
          <CheckCircle2 v-else class="h-3.5 w-3.5" />
          {{ isLockedForActive ? t.alltagReview.checked() : t.alltagReview.submit() }}
        </button>

      </div>

      <div v-if="latest" class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <div class="flex items-center justify-between">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.alltag.feedback() }}</p>
          <p class="text-sm font-semibold text-[var(--text)]">{{ latest.naturalnessScore }}%</p>
        </div>
        <p v-if="latestExpression" class="mt-2 text-xs text-[var(--muted)]">{{ latestExpression }}</p>
        <p class="mt-2 text-sm text-[var(--text)]">{{ latest.feedback || t.alltagReview.naturalFallback() }}</p>
      </div>
    </section>
  </AppContainer>
</template>
