<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import { ArrowLeft, CheckCircle2, Languages, Loader2, Puzzle, Sparkles } from "lucide-vue-next";
import AppContainer from "./AppContainer.vue";
import ScoreRing from "./ScoreRing.vue";
import { useCollocationReviewAttemptMutation, useCollocationReviewQuery } from "@/queries/collocations";

const router = useRouter();
const { t } = useLanguage();
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);
const form = reactive({ userAnswerText: "" });
const latest = ref<{ score: number; feedback: string } | null>(null);
const latestCollocation = ref<string | null>(null);
const completedReviewIds = ref<Set<number>>(new Set());

const reviewQuery = useCollocationReviewQuery();
const assessMutation = useCollocationReviewAttemptMutation();

const reviewItems = computed(() => reviewQuery.data.value?.items ?? []);
const activeReviewItemId = ref<number | null>(null);

const activeItem = computed(() => {
  if (activeReviewItemId.value === null) {
    return null;
  }
  return reviewItems.value.find((item) => item.id === activeReviewItemId.value) ?? null;
});

const GAP_PATTERN = /_{2,}/;

const clozeParts = computed(() => {
  const sentence = activeItem.value?.clozeSentence ?? "";
  const match = sentence.match(GAP_PATTERN);
  if (!match || match.index === undefined) {
    return { before: sentence, hasGap: false, after: "" };
  }
  return {
    before: sentence.slice(0, match.index),
    hasGap: true,
    after: sentence.slice(match.index + match[0].length)
  };
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
    notice.value = { type: "error", text: t.kollok.answerPrompt() };
    return;
  }

  const submittedId = activeItem.value.id;
  const data = await assessMutation.mutateAsync({
    reviewItemId: submittedId,
    userAnswerText: form.userAnswerText.trim()
  });
  latestCollocation.value = activeItem.value.englishText;
  latest.value = { score: data.score, feedback: data.feedback };
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
    <section class="animate-fade-up space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button
            class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
            @click="router.push('/kollokationen')"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
            {{ t.common.back() }}
          </button>
          <h1 class="page-title">{{ t.kollokReview.title() }}</h1>
        </div>
        <span v-if="reviewItems.length" class="chip-accent px-3 py-1.5">
          {{ t.vocab.due({ count: reviewQuery.data.value?.dueCount ?? reviewItems.length }) }}
        </span>
      </header>

      <p v-if="notice" :class="notice.type === 'error' ? 'notice-error' : 'notice-success'">
        {{ notice.text }}
      </p>

      <div
        v-if="!reviewItems.length && !reviewQuery.isFetching.value && !latest"
        class="card flex flex-col items-center gap-3 border-dashed px-6 py-12 text-center"
      >
        <span class="eyebrow-icon h-12 w-12 rounded-2xl">
          <Sparkles class="h-6 w-6" />
        </span>
        <p class="font-serif text-xl font-semibold">{{ t.alltagReview.noDueTitle() }}</p>
        <p class="text-sm text-[var(--muted)]">{{ t.alltagReview.noDueHint() }}</p>
      </div>

      <div v-if="reviewItems.length" class="card-hero p-5 sm:p-6">
        <div class="flex items-start justify-between gap-3">
          <span class="eyebrow">
            <span class="eyebrow-icon"><Puzzle class="h-3 w-3" /></span>
            {{ t.kollok.fillTheGap() }}
          </span>
        </div>

        <p class="mt-4 font-serif text-xl leading-relaxed sm:text-2xl">
          {{ clozeParts.before }}<span
            v-if="clozeParts.hasGap"
            class="mx-1 inline-block min-w-[90px] rounded-lg border-b-2 border-dashed border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 text-center align-baseline text-[var(--accent-strong)]"
          >&nbsp;?&nbsp;</span>{{ clozeParts.after }}
        </p>

        <div class="mt-4 flex items-center gap-2">
          <span class="eyebrow-icon shrink-0"><Languages class="h-3 w-3" /></span>
          <p class="text-sm font-semibold text-[var(--accent-strong)]">{{ activeItem?.englishText }}</p>
        </div>

        <div class="mt-5">
          <label class="eyebrow">{{ t.kollok.answerPrompt() }}</label>
          <textarea
            v-model="form.userAnswerText"
            class="input mt-2 min-h-[72px] resize-y"
            :placeholder="t.kollok.answerPlaceholder()"
            :disabled="isLockedForActive"
            @keydown.enter.exact.prevent="submitReviewAttempt"
          />
        </div>

        <button
          class="btn-primary mt-4 w-full sm:w-auto"
          :disabled="assessMutation.isPending.value || !form.userAnswerText.trim() || isLockedForActive"
          @click="submitReviewAttempt"
        >
          <Loader2 v-if="assessMutation.isPending.value" class="h-4 w-4 animate-spin" />
          <CheckCircle2 v-else class="h-4 w-4" />
          {{ isLockedForActive ? t.alltagReview.checked() : t.alltagReview.submit() }}
        </button>
      </div>

      <div v-if="latest" class="card animate-fade-up p-5">
        <div class="flex flex-col-reverse items-center gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <p class="eyebrow">{{ t.alltag.feedback() }}</p>
            <p v-if="latestCollocation" class="mt-2 text-xs italic text-[var(--muted)]">{{ latestCollocation }}</p>
            <p class="mt-2.5 text-sm leading-relaxed">{{ latest.feedback || t.alltagReview.naturalFallback() }}</p>
          </div>
          <ScoreRing :score="latest.score" class="shrink-0" />
        </div>
      </div>
    </section>
  </AppContainer>
</template>
