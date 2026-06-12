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

const sessionProgress = computed(() => {
  const total = reviewedCount.value + remainingCount.value;
  if (total === 0) {
    return 100;
  }
  return Math.round((reviewedCount.value / total) * 100);
});

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
    <section class="animate-fade-up space-y-6">
      <header class="flex items-end justify-between gap-4">
        <div>
          <button
            class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
            @click="router.push('/vocabulary')"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
            {{ t.vocab.review.back() }}
          </button>
          <h2 class="page-title">{{ t.vocab.review.title() }}</h2>
          <p class="page-subtitle">{{ t.vocab.review.subtitle() }}</p>
        </div>
        <div class="card shrink-0 px-4 py-3 text-right">
          <p class="font-serif text-2xl font-semibold leading-none">{{ remainingCount }}</p>
          <p class="mt-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.vocab.review.remaining() }}</p>
        </div>
      </header>

      <!-- Session progress -->
      <div v-if="reviewedCount + remainingCount > 0" class="space-y-1.5">
        <div class="flex items-center justify-between text-[11px] font-semibold text-[var(--muted)]">
          <span>{{ t.vocab.review.progress({ count: reviewedCount }) }}</span>
          <span>{{ sessionProgress }}%</span>
        </div>
        <div class="h-2 overflow-hidden rounded-full bg-[var(--panel-soft)]">
          <div
            class="h-full rounded-full transition-all duration-500"
            style="background-image: linear-gradient(90deg, var(--accent), var(--accent-strong))"
            :style="{ width: `${sessionProgress}%` }"
          />
        </div>
      </div>

      <p v-if="reviewMutation.error.value || dueQuery.error.value" class="notice-error">
        {{ reviewMutation.error.value?.message ?? dueQuery.error.value?.message }}
      </p>

      <div v-if="dueQuery.isFetching.value && !currentItem" class="card p-10 text-center text-sm text-[var(--muted)]">
        {{ t.common.loading() }}
      </div>

      <div
        v-else-if="!currentItem"
        class="card animate-pop-in overflow-hidden border-[color-mix(in_srgb,var(--status-good)_35%,var(--line))]"
      >
        <div class="flex flex-col items-center px-8 py-14 text-center">
          <div class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel-soft))] shadow-[0_8px_24px_color-mix(in_srgb,var(--status-good)_25%,transparent)]">
            <CheckCircle2 class="h-8 w-8 text-[var(--status-good)]" />
          </div>
          <h3 class="mt-5 font-serif text-3xl font-semibold">{{ t.vocab.review.completeTitle() }}</h3>
          <p class="mt-2 max-w-sm text-sm leading-relaxed text-[var(--muted)]">
            {{ reviewedCount ? t.vocab.review.completed({ count: reviewedCount }) : t.vocab.review.noneDue() }}
          </p>
          <p class="chip mt-5 px-3.5 py-1.5">
            {{ t.vocab.review.next({ time: formatNextReview(dueQuery.data.value?.nextDueAt) }) }}
          </p>
        </div>
      </div>

      <article v-else class="card overflow-hidden">
        <div class="border-b border-[var(--line)] bg-[var(--panel-soft)] px-6 py-3">
          <div class="flex items-center justify-between text-[10px] font-semibold uppercase tracking-wider text-[var(--muted)]">
            <span class="inline-flex items-center gap-2">
              <BookOpenCheck class="h-3.5 w-3.5 text-[var(--accent)]" />
              {{ currentItem.category }}
            </span>
            <span>{{ t.vocab.review.progress({ count: reviewedCount }) }}</span>
          </div>
        </div>

        <div class="px-5 py-10 text-center sm:px-10 sm:py-12">
          <p class="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--muted)]">
            {{ t.vocab.review.recallPrompt() }}
          </p>
          <h3 class="mt-5 font-serif text-4xl font-semibold tracking-tight sm:text-5xl">{{ currentItem.word }}</h3>

          <button v-if="!revealed" class="btn-primary mt-10" @click="revealed = true">
            <Eye class="h-4 w-4" />
            {{ t.vocab.review.showAnswer() }}
          </button>

          <div v-else class="mt-10 animate-fade-up text-left">
            <div class="rounded-2xl border border-[color-mix(in_srgb,var(--accent)_24%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_7%,var(--panel-soft))] p-5">
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

            <p class="mt-7 text-center text-xs font-medium text-[var(--muted)]">
              {{ t.vocab.review.ratePrompt() }}
            </p>
            <div class="mt-3 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              <button
                v-for="option in ratingOptions"
                :key="option.value"
                class="rounded-xl border px-3 py-3 text-xs font-bold transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-55"
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
