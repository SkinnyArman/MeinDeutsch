<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useLanguage } from "@/libs/i18n";
import {
  BookOpen,
  Briefcase,
  Circle,
  Clock,
  Heart,
  Home,
  MapPin,
  Sparkles,
  UtensilsCrossed
} from "lucide-vue-next";
import type { VocabularyItemRecord } from "@/types/ApiTypes";
import { DEFAULT_PAGE_SIZE } from "@/constants/app";
import AppContainer from "./AppContainer.vue";
import {
  useVocabularyAllQuery,
  useVocabularyCategoriesQuery,
  useVocabularyListQuery,
  useVocabularyReviewMutation
} from "@/queries/vocabulary";

const { t } = useLanguage();
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);

const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const selectedCategory = ref<string>("");

const categoriesQuery = useVocabularyCategoriesQuery();
const wordsQuery = useVocabularyListQuery({
  category: () => selectedCategory.value,
  page: () => page.value,
  pageSize: pageSize.value
});
const allWordsQuery = useVocabularyAllQuery();

const reviewMutation = useVocabularyReviewMutation({
  category: () => selectedCategory.value,
  page: () => page.value,
  pageSize: () => pageSize.value
});

watchEffect(() => {
  if (!selectedCategory.value && categoriesQuery.data.value?.length) {
    selectedCategory.value = categoriesQuery.data.value[0].name;
  }
});

watchEffect(() => {
  if (categoriesQuery.error.value) {
    notice.value = { type: "error", text: categoriesQuery.error.value.message };
  }
  if (wordsQuery.error.value) {
    notice.value = { type: "error", text: wordsQuery.error.value.message };
  }
  if (allWordsQuery.error.value) {
    notice.value = { type: "error", text: allWordsQuery.error.value.message };
  }
  if (reviewMutation.error.value) {
    notice.value = { type: "error", text: reviewMutation.error.value.message };
  }
});

const words = computed(() => wordsQuery.data.value?.items ?? []);
const totalPages = computed(() => wordsQuery.data.value?.totalPages ?? 1);

const allWords = computed(() => allWordsQuery.data.value?.items ?? []);
const totalWords = computed(() => allWords.value.length);
const dueNowCount = computed(() => allWords.value.filter((item) => dueState(item) === "due").length);
const dueSoonCount = computed(() => allWords.value.filter((item) => dueState(item) === "soon").length);

const categoryCountMap = computed<Record<string, number>>(() => {
  const acc: Record<string, number> = {};
  for (const item of allWords.value) {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
  }
  return acc;
});

const ratingLabels = computed<Record<1 | 2 | 3 | 4, string>>(() => ({
  1: t.vocab.rating.again(),
  2: t.vocab.rating.hard(),
  3: t.vocab.rating.good(),
  4: t.vocab.rating.easy()
}));

const ratingScale = [1, 2, 3, 4] as const;

const iconMap: Record<string, unknown> = {
  clock: Clock,
  utensils: UtensilsCrossed,
  briefcase: Briefcase,
  home: Home,
  heart: Heart,
  "map-pin": MapPin,
  sparkle: Sparkles,
  dot: Circle
};

const categoryIcon = (iconName: string) => iconMap[iconName] ?? Circle;

const dueState = (item: VocabularyItemRecord): "due" | "soon" | "later" => {
  if (!item.srsDueAt) {
    return "due";
  }
  const dueMs = new Date(item.srsDueAt).getTime();
  const nowMs = Date.now();
  const diffDays = (dueMs - nowMs) / (24 * 60 * 60 * 1000);
  if (diffDays <= 0) {
    return "due";
  }
  if (diffDays <= 3) {
    return "soon";
  }
  return "later";
};

const isDueNow = (item: VocabularyItemRecord): boolean => dueState(item) === "due";

const dueBadge = (item: VocabularyItemRecord): string => {
  const state = dueState(item);
  if (state === "due") {
    return t.vocab.dueBadge();
  }
  if (state === "soon") {
    return t.vocab.soonBadge();
  }
  const days = Math.ceil((new Date(item.srsDueAt ?? Date.now()).getTime() - Date.now()) / (24 * 60 * 60 * 1000));
  return t.vocab.daysBadge({ days });
};

const refreshAll = async (): Promise<void> => {
  await Promise.all([categoriesQuery.refetch(), allWordsQuery.refetch(), wordsQuery.refetch()]);
  notice.value = { type: "success", text: t.vocab.refreshed() };
};

const submitSrsRating = async (item: VocabularyItemRecord, rating: 1 | 2 | 3 | 4): Promise<void> => {
  if (!isDueNow(item)) {
    notice.value = { type: "error", text: t.vocab.notDue() };
    return;
  }

  await reviewMutation.mutateAsync({ item, rating });
  notice.value = { type: "success", text: t.vocab.reviewSaved({ word: item.word, rating: ratingLabels.value[rating] }) };
};

const goPrev = () => {
  if (page.value > 1) {
    page.value -= 1;
  }
};

const goNext = () => {
  if (page.value < totalPages.value) {
    page.value += 1;
  }
};

watchEffect(() => {
  if (selectedCategory.value) {
    page.value = 1;
  }
});
</script>

<template>
  <AppContainer>
    <section class="w-full space-y-5">
      <header>
        <h2 class="font-serif text-3xl font-semibold tracking-tight">{{ t.vocab.title() }}</h2>
        <p class="mt-1 text-xs text-[var(--muted)]">{{ t.vocab.subtitle() }}</p>
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

      <div class="grid gap-5 md:grid-cols-[220px_1fr]">
        <aside>
          <div class="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            <p>{{ t.vocab.categories() }}</p>
            <button
              class="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[10px] transition hover:border-[var(--accent)]"
              :disabled="categoriesQuery.isFetching.value || wordsQuery.isFetching.value || allWordsQuery.isFetching.value"
              @click="refreshAll"
            >
              {{ categoriesQuery.isFetching.value || wordsQuery.isFetching.value || allWordsQuery.isFetching.value ? t.common.loading() : t.common.refresh() }}
            </button>
          </div>
          <div v-if="!categoriesQuery.data.value?.length && !categoriesQuery.isFetching.value" class="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-3 text-xs text-[var(--muted)]">
            {{ t.vocab.noCategories() }}
          </div>
          <nav v-else class="space-y-1">
            <button
              v-for="category in categoriesQuery.data.value ?? []"
              :key="category.name"
              class="flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition"
              :class="selectedCategory === category.name
                ? 'border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel-soft))]'
                : 'border-transparent bg-transparent text-[var(--muted)] hover:border-[var(--line)] hover:bg-[var(--panel-soft)]'"
              @click="selectedCategory = category.name"
            >
              <span class="flex min-w-0 items-center gap-2">
                <component :is="categoryIcon(category.icon)" class="h-3.5 w-3.5 shrink-0" />
                <span class="truncate">{{ category.name }}</span>
              </span>
              <span class="text-[10px] opacity-65">{{ categoryCountMap[category.name] ?? 0 }}</span>
            </button>
          </nav>
        </aside>

        <section class="space-y-2">
          <div class="flex items-center gap-4 px-1 text-xs">
            <div class="inline-flex items-center gap-1 text-[var(--muted)]">
              <BookOpen class="h-4 w-4" />
              <span>{{ t.vocab.words({ count: totalWords }) }}</span>
            </div>
            <span class="h-4 w-px bg-[var(--line)]" />
            <span class="rounded-full border border-[color-mix(in_srgb,var(--status-bad)_38%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_12%,var(--panel-soft))] px-2 py-0.5">
              {{ t.vocab.due({ count: dueNowCount }) }}
            </span>
            <span class="rounded-full border border-[var(--line)] bg-[var(--panel)] px-2 py-0.5 text-[var(--muted)]">
              {{ t.vocab.soon({ count: dueSoonCount }) }}
            </span>
          </div>

          <div class="flex items-center justify-end gap-2 px-1 text-xs">
            <button
              class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-1 transition hover:border-[var(--accent)] disabled:opacity-60"
              :disabled="wordsQuery.isFetching.value || page <= 1"
              @click="goPrev"
            >
              {{ t.common.previous() }}
            </button>
            <span class="text-[var(--muted)]">{{ t.common.page() }} {{ page }} {{ t.common.of() }} {{ totalPages }}</span>
            <button
              class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-1 transition hover:border-[var(--accent)] disabled:opacity-60"
              :disabled="wordsQuery.isFetching.value || page >= totalPages"
              @click="goNext"
            >
              {{ t.common.next() }}
            </button>
          </div>

          <div v-if="!words.length && !wordsQuery.isFetching.value" class="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
            {{ t.vocab.noWords() }}
          </div>

          <article
            v-for="item in words"
            :key="item.id"
            class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-base font-semibold">{{ item.word }}</p>
                <p class="text-xs text-[var(--muted)]">{{ item.description }}</p>
              </div>
              <span
                class="rounded-full border px-2 py-0.5 text-[10px]"
                :class="dueState(item) === 'due'
                  ? 'border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] text-[var(--status-bad)]'
                  : dueState(item) === 'soon'
                    ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] text-[var(--accent)]'
                    : 'border-[var(--line)] text-[var(--muted)]'"
              >
                {{ dueBadge(item) }}
              </span>
            </div>

            <div v-if="item.examples.length" class="mt-2 space-y-1">
              <p v-for="(example, idx) in item.examples" :key="`ex-${item.id}-${idx}`" class="truncate border-l-2 border-[var(--line)] pl-2 text-[11px] italic text-[var(--muted)]">
                {{ example }}
              </p>
            </div>

            <div class="mt-3 flex flex-wrap items-center gap-2 text-[10px]">
              <button
                v-for="rating in ratingScale"
                :key="rating"
                class="flex-1 rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-1 text-[10px] transition hover:border-[var(--accent)] disabled:cursor-not-allowed disabled:opacity-50"
                :disabled="reviewMutation.isPending.value || !isDueNow(item)"
                @click="submitSrsRating(item, rating)"
              >
                {{ ratingLabels[rating] }}
              </button>
            </div>
          </article>
        </section>
      </div>
    </section>
  </AppContainer>
</template>
