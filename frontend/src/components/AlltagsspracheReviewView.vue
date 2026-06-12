<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import { ArrowLeft, ArrowRight, CheckCircle2, ClipboardCheck, Loader2, Sparkles } from "lucide-vue-next";
import type { ExpressionReviewItemRecord } from "@/types/ApiTypes";
import AppContainer from "./AppContainer.vue";
import ScoreRing from "./ScoreRing.vue";
import { useAlltagReviewAttemptMutation, useAlltagReviewQuery } from "@/queries/alltag";

const router = useRouter();
const { t } = useLanguage();
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);
const form = reactive({ userAnswerText: "" });
const latest = ref<{ naturalnessScore: number; feedback: string } | null>(null);

const reviewQuery = useAlltagReviewQuery();
const assessMutation = useAlltagReviewAttemptMutation();

// The due list mutates server-side after every answer, so the session iterates
// a snapshot taken when the page loads instead of the live query result.
const sessionQueue = ref<ExpressionReviewItemRecord[]>([]);
const sessionIndex = ref(0);
const sessionInitialized = ref(false);
const answered = ref(false);

watchEffect(() => {
  const items = reviewQuery.data.value?.items;
  if (!sessionInitialized.value && items) {
    sessionQueue.value = [...items];
    sessionInitialized.value = true;
  }
});

const activeItem = computed(() => sessionQueue.value[sessionIndex.value] ?? null);
const remainingCount = computed(() => Math.max(0, sessionQueue.value.length - sessionIndex.value));
const hasMoreAfterCurrent = computed(() => sessionIndex.value < sessionQueue.value.length - 1);

watchEffect(() => {
  if (reviewQuery.error.value) {
    notice.value = { type: "error", text: reviewQuery.error.value.message };
  }
  if (assessMutation.error.value) {
    notice.value = { type: "error", text: assessMutation.error.value.message };
  }
});

const submitReviewAttempt = async (): Promise<void> => {
  if (!activeItem.value || answered.value) {
    return;
  }
  if (!form.userAnswerText.trim()) {
    notice.value = { type: "error", text: t.alltagReview.answerPrompt() };
    return;
  }

  const data = await assessMutation.mutateAsync({
    reviewItemId: activeItem.value.id,
    userAnswerText: form.userAnswerText.trim()
  });
  latest.value = { naturalnessScore: data.naturalnessScore, feedback: data.feedback };
  answered.value = true;
  void reviewQuery.refetch();
};

const goToNextCard = (): void => {
  sessionIndex.value += 1;
  latest.value = null;
  answered.value = false;
  form.userAnswerText = "";
  notice.value = null;
};
</script>

<template>
  <AppContainer size="sm">
    <section class="animate-fade-up space-y-5">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <button
            class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
            @click="router.push('/alltagssprache')"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
            {{ t.common.back() }}
          </button>
          <h1 class="page-title">{{ t.alltagReview.title() }}</h1>
        </div>
        <span v-if="remainingCount > 0" class="chip-accent px-3 py-1.5">
          {{ t.vocab.due({ count: remainingCount }) }}
        </span>
      </header>

      <p v-if="notice" :class="notice.type === 'error' ? 'notice-error' : 'notice-success'">
        {{ notice.text }}
      </p>

      <div
        v-if="sessionInitialized && !activeItem"
        class="card flex flex-col items-center gap-3 border-dashed px-6 py-12 text-center"
      >
        <span class="eyebrow-icon h-12 w-12 rounded-2xl">
          <Sparkles class="h-6 w-6" />
        </span>
        <p class="font-serif text-xl font-semibold">
          {{ sessionQueue.length ? t.alltagReview.sessionDone() : t.alltagReview.noDueTitle() }}
        </p>
        <p class="text-sm text-[var(--muted)]">{{ t.alltagReview.noDueHint() }}</p>
      </div>

      <div v-if="activeItem" class="card-hero p-5 sm:p-6">
        <div class="flex items-start justify-between gap-3">
          <div class="min-w-0">
            <p class="eyebrow">{{ t.alltag.expressInGerman() }}</p>
            <p class="mt-3 font-serif text-2xl leading-snug">“{{ activeItem.englishText }}”</p>
          </div>
          <span class="eyebrow-icon mt-1 h-8 w-8 shrink-0 rounded-xl">
            <ClipboardCheck class="h-4 w-4" />
          </span>
        </div>

        <div class="mt-5">
          <label class="eyebrow">{{ t.alltagReview.answerPrompt() }}</label>
          <textarea
            v-model="form.userAnswerText"
            class="input mt-2 min-h-[96px] resize-y"
            :placeholder="t.alltag.answerPlaceholder()"
            :disabled="answered"
            @keydown.enter.exact.prevent="submitReviewAttempt"
          />
        </div>

        <div class="mt-4 flex flex-wrap items-center gap-2.5">
          <button
            v-if="!answered"
            class="btn-primary w-full sm:w-auto"
            :disabled="assessMutation.isPending.value || !form.userAnswerText.trim()"
            @click="submitReviewAttempt"
          >
            <Loader2 v-if="assessMutation.isPending.value" class="h-4 w-4 animate-spin" />
            <CheckCircle2 v-else class="h-4 w-4" />
            {{ t.alltagReview.submit() }}
          </button>
          <button v-else class="btn-primary w-full sm:w-auto" @click="goToNextCard">
            {{ hasMoreAfterCurrent ? t.alltagReview.nextCard() : t.alltagReview.checked() }}
            <ArrowRight class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div v-if="latest" class="card animate-fade-up p-5">
        <div class="flex flex-col-reverse items-center gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div class="min-w-0 flex-1">
            <p class="eyebrow">{{ t.alltag.feedback() }}</p>
            <p v-if="activeItem" class="mt-2 text-xs italic text-[var(--muted)]">“{{ activeItem.englishText }}”</p>
            <p class="mt-2.5 text-sm leading-relaxed">{{ latest.feedback || t.alltagReview.naturalFallback() }}</p>
          </div>
          <ScoreRing :score="latest.naturalnessScore" class="shrink-0" />
        </div>
      </div>
    </section>
  </AppContainer>
</template>
