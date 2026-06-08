<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import {
  ArrowLeft,
  BookOpenCheck,
  CheckCircle2,
  Eye,
  RotateCcw
} from "lucide-vue-next";
import {
  VOCABULARY_REVIEW_RATINGS,
  type VocabularyReviewRating
} from "@/types/ApiTypes";
import { useLanguage } from "@/libs/i18n";
import {
  useVocabularyDueQuery,
  useVocabularyReviewMutation
} from "@/queries/vocabulary";
import AppContainer from "./AppContainer.vue";

const router = useRouter();
const { t } = useLanguage();
const dueQuery = useVocabularyDueQuery();
const reviewMutation = useVocabularyReviewMutation();
const revealed = ref(false);
const reviewedCount = ref(0);

const currentItem = computed(() => dueQuery.data.value?.items[0] ?? null);
const remainingCount = computed(() => dueQuery.data.value?.dueCount ?? 0);

const ratingOptions = computed<Array<{
  value: VocabularyReviewRating;
  label: string;
  className: string;
}>>(() => [
  {
    value: VOCABULARY_REVIEW_RATINGS.AGAIN,
    label: t.vocab.rating.again(),
    className: "border-[var(--status-bad)] bg-[color-mix(in_srgb,var(--status-bad)_12%,var(--panel))] text-[var(--status-bad)]"
  },
  {
    value: VOCABULARY_REVIEW_RATINGS.HARD,
    label: t.vocab.rating.hard(),
    className: "border-[color-mix(in_srgb,var(--status-warn)_65%,var(--line))] bg-[color-mix(in_srgb,var(--status-warn)_12%,var(--panel))]"
  },
  {
    value: VOCABULARY_REVIEW_RATINGS.GOOD,
    label: t.vocab.rating.good(),
    className: "border-[color-mix(in_srgb,var(--accent)_65%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--panel))]"
  },
  {
    value: VOCABULARY_REVIEW_RATINGS.EASY,
    label: t.vocab.rating.easy(),
    className: "border-[var(--status-good)] bg-[color-mix(in_srgb,var(--status-good)_12%,var(--panel))] text-[var(--status-good)]"
  }
]);

watch(
  () => currentItem.value?.id,
  () => {
    revealed.value = false;
  }
);

const submitRating = async (rating: VocabularyReviewRating): Promise<void> => {
  if (!currentItem.value || !revealed.value || reviewMutation.isPending.value) {
    return;
  }
  await reviewMutation.mutateAsync({ item: currentItem.value, rating });
  reviewedCount.value += 1;
};

const formatNextReview = (value: string | null | undefined): string => {
  if (!value) {
    return t.vocab.review.noScheduled();
  }
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(new Date(value));
};
</script>

<template>
  <AppContainer size="sm">
    <section class="space-y-6">
      <header class="flex items-start justify-between gap-4">
        <div>
          <button
            class="mb-3 inline-flex items-center gap-1.5 text-xs text-[var(--muted)] transition hover:text-[var(--text)]"
            @click="router.push('/vocabulary')"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
            {{ t.vocab.review.back() }}
          </button>
          <h2 class="font-serif text-3xl font-semibold tracking-tight">{{ t.vocab.review.title() }}</h2>
          <p class="mt-1 text-xs text-[var(--muted)]">{{ t.vocab.review.subtitle() }}</p>
        </div>
        <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-right shadow-[var(--surface-shadow)]">
          <p class="text-lg font-semibold">{{ remainingCount }}</p>
          <p class="text-[10px] uppercase tracking-wide text-[var(--muted)]">{{ t.vocab.review.remaining() }}</p>
        </div>
      </header>

      <p
        v-if="reviewMutation.error.value || dueQuery.error.value"
        class="rounded-lg border border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_12%,var(--panel))] px-3 py-2 text-xs"
      >
        {{ reviewMutation.error.value?.message ?? dueQuery.error.value?.message }}
      </p>

      <div
        v-if="dueQuery.isFetching.value && !currentItem"
        class="rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-10 text-center text-sm text-[var(--muted)]"
      >
        {{ t.common.loading() }}
      </div>

      <div
        v-else-if="!currentItem"
        class="overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--status-good)_35%,var(--line))] bg-[var(--panel)] shadow-[var(--surface-shadow)]"
      >
        <div class="flex flex-col items-center px-8 py-12 text-center">
          <div class="flex h-14 w-14 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel-soft))]">
            <CheckCircle2 class="h-7 w-7 text-[var(--status-good)]" />
          </div>
          <h3 class="mt-4 font-serif text-2xl font-semibold">{{ t.vocab.review.completeTitle() }}</h3>
          <p class="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            {{ reviewedCount ? t.vocab.review.completed({ count: reviewedCount }) : t.vocab.review.noneDue() }}
          </p>
          <p class="mt-4 rounded-full bg-[var(--panel-soft)] px-3 py-1.5 text-xs text-[var(--muted)]">
            {{ t.vocab.review.next({ time: formatNextReview(dueQuery.data.value?.nextDueAt) }) }}
          </p>
        </div>
      </div>

      <article
        v-else
        class="overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] shadow-[var(--surface-shadow)]"
      >
        <div class="border-b border-[var(--line)] bg-[var(--panel-soft)] px-6 py-3">
          <div class="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            <span class="inline-flex items-center gap-2">
              <BookOpenCheck class="h-3.5 w-3.5 text-[var(--accent)]" />
              {{ currentItem.category }}
            </span>
            <span>{{ t.vocab.review.progress({ count: reviewedCount }) }}</span>
          </div>
        </div>

        <div class="px-6 py-10 text-center sm:px-10">
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            {{ t.vocab.review.recallPrompt() }}
          </p>
          <h3 class="mt-4 font-serif text-4xl font-semibold tracking-tight">{{ currentItem.word }}</h3>

          <button
            v-if="!revealed"
            class="mt-8 inline-flex items-center gap-2 rounded-lg bg-[var(--accent)] px-4 py-2.5 text-sm font-semibold text-[var(--accent-contrast)] transition hover:opacity-90"
            @click="revealed = true"
          >
            <Eye class="h-4 w-4" />
            {{ t.vocab.review.showAnswer() }}
          </button>

          <div v-else class="mt-8 animate-[fade-in_180ms_ease-out] text-left">
            <div class="rounded-xl border border-[color-mix(in_srgb,var(--accent)_24%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_7%,var(--panel-soft))] p-4">
              <p class="text-sm leading-relaxed">{{ currentItem.description }}</p>
              <div v-if="currentItem.examples.length" class="mt-4 space-y-2">
                <p
                  v-for="(example, index) in currentItem.examples"
                  :key="`${currentItem.id}-${index}`"
                  class="border-l-2 border-[var(--accent)] pl-3 text-xs italic leading-relaxed text-[var(--muted)]"
                >
                  {{ example }}
                </p>
              </div>
            </div>

            <p class="mt-6 text-center text-xs font-medium text-[var(--muted)]">
              {{ t.vocab.review.ratePrompt() }}
            </p>
            <div class="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <button
                v-for="option in ratingOptions"
                :key="option.value"
                class="rounded-lg border px-3 py-2.5 text-xs font-semibold transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-55"
                :class="option.className"
                :disabled="reviewMutation.isPending.value"
                @click="submitRating(option.value)"
              >
                <RotateCcw v-if="option.value === VOCABULARY_REVIEW_RATINGS.AGAIN" class="mx-auto mb-1 h-3.5 w-3.5" />
                {{ option.label }}
              </button>
            </div>
          </div>
        </div>
      </article>
    </section>
  </AppContainer>
</template>
