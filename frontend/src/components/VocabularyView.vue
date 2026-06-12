<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useLanguage } from "@/libs/i18n";
import { useRouter } from "vue-router";
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
  useVocabularyDueQuery,
  useVocabularyListQuery,
} from "@/queries/vocabulary";

const { t } = useLanguage();
const router = useRouter();
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
const dueQuery = useVocabularyDueQuery(1);

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
  if (dueQuery.error.value) {
    notice.value = { type: "error", text: dueQuery.error.value.message };
  }
});

const words = computed(() => wordsQuery.data.value?.items ?? []);
const totalPages = computed(() => wordsQuery.data.value?.totalPages ?? 1);

const allWords = computed(() => allWordsQuery.data.value?.items ?? []);
const totalWords = computed(() => allWords.value.length);
const dueNowCount = computed(() => dueQuery.data.value?.dueCount ?? 0);
const dueSoonCount = computed(() => allWords.value.filter((item) => dueState(item) === "soon").length);

const categoryCountMap = computed<Record<string, number>>(() => {
  const acc: Record<string, number> = {};
  for (const item of allWords.value) {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
  }
  return acc;
});

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
    <section class="w-full animate-fade-up space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="page-title">{{ t.vocab.title() }}</h2>
          <p class="page-subtitle">{{ t.vocab.subtitle() }}</p>
        </div>
        <button class="btn-primary" @click="router.push('/vocabulary/review')">
          <BookOpen class="h-4 w-4" />
          {{ t.vocab.startReview() }}
          <span class="rounded-full bg-white/25 px-2 py-0.5 text-[11px] font-bold">
            {{ dueNowCount }}
          </span>
        </button>
      </header>

      <p v-if="notice" :class="notice.type === 'error' ? 'notice-error' : 'notice-success'">
        {{ notice.text }}
      </p>

      <!-- Compact stat strip -->
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="chip px-3 py-1.5">
          <BookOpen class="h-3.5 w-3.5" />
          {{ t.vocab.words({ count: totalWords }) }}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--status-bad)_40%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_10%,var(--panel))] px-3 py-1.5 font-semibold text-[var(--status-bad)]">
          {{ t.vocab.due({ count: dueNowCount }) }}
        </span>
        <span class="inline-flex items-center gap-1.5 rounded-full border border-[color-mix(in_srgb,var(--status-warn)_40%,var(--line))] bg-[color-mix(in_srgb,var(--status-warn)_10%,var(--panel))] px-3 py-1.5 font-semibold text-[var(--status-warn)]">
          {{ t.vocab.soon({ count: dueSoonCount }) }}
        </span>
      </div>

      <!-- Mobile: category chips -->
      <div class="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 md:hidden">
        <button
          v-for="category in categoriesQuery.data.value ?? []"
          :key="`chip-${category.name}`"
          class="shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold transition"
          :class="selectedCategory === category.name
            ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel))] text-[var(--accent-strong)]'
            : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)]'"
          @click="selectedCategory = category.name"
        >
          {{ category.name }}
          <span class="ml-1 opacity-60">{{ categoryCountMap[category.name] ?? 0 }}</span>
        </button>
      </div>

      <div class="grid gap-6 md:grid-cols-[230px_1fr]">
        <!-- Desktop: category sidebar -->
        <aside class="hidden md:block">
          <div class="mb-2.5 flex items-center justify-between">
            <p class="eyebrow">{{ t.vocab.categories() }}</p>
            <button
              class="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)] transition hover:text-[var(--accent)]"
              :disabled="categoriesQuery.isFetching.value || wordsQuery.isFetching.value || allWordsQuery.isFetching.value"
              @click="refreshAll"
            >
              {{ categoriesQuery.isFetching.value || wordsQuery.isFetching.value || allWordsQuery.isFetching.value ? t.common.loading() : t.common.refresh() }}
            </button>
          </div>
          <div v-if="!categoriesQuery.data.value?.length && !categoriesQuery.isFetching.value" class="card border-dashed p-3 text-xs text-[var(--muted)]">
            {{ t.vocab.noCategories() }}
          </div>
          <nav v-else class="space-y-1">
            <button
              v-for="category in categoriesQuery.data.value ?? []"
              :key="category.name"
              class="flex w-full items-center justify-between rounded-xl border px-3 py-2.5 text-left text-xs font-medium transition-all duration-150"
              :class="selectedCategory === category.name
                ? 'border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--panel))] text-[var(--text)]'
                : 'border-transparent bg-transparent text-[var(--muted)] hover:bg-[var(--panel-soft)] hover:text-[var(--text)]'"
              @click="selectedCategory = category.name"
            >
              <span class="flex min-w-0 items-center gap-2.5">
                <component
                  :is="categoryIcon(category.icon)"
                  class="h-4 w-4 shrink-0"
                  :class="selectedCategory === category.name ? 'text-[var(--accent)]' : ''"
                />
                <span class="truncate">{{ category.name }}</span>
              </span>
              <span class="text-[10px] font-bold opacity-60">{{ categoryCountMap[category.name] ?? 0 }}</span>
            </button>
          </nav>
        </aside>

        <section class="space-y-3">
          <div v-if="!words.length && !wordsQuery.isFetching.value" class="card border-dashed p-5 text-sm text-[var(--muted)]">
            {{ t.vocab.noWords() }}
          </div>

          <div class="space-y-3">
            <article v-for="item in words" :key="item.id" class="card card-hover p-4">
              <div class="flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <p class="font-serif text-lg font-semibold leading-tight">{{ item.word }}</p>
                  <p class="mt-1 text-xs leading-relaxed text-[var(--muted)]">{{ item.description }}</p>
                </div>
                <span
                  class="shrink-0 rounded-full border px-2.5 py-1 text-[10px] font-bold"
                  :class="dueState(item) === 'due'
                    ? 'border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_10%,transparent)] text-[var(--status-bad)]'
                    : dueState(item) === 'soon'
                      ? 'border-[color-mix(in_srgb,var(--status-warn)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-warn)_10%,transparent)] text-[var(--status-warn)]'
                      : 'border-[var(--line)] text-[var(--muted)]'"
                >
                  {{ dueBadge(item) }}
                </span>
              </div>

              <div v-if="item.examples.length" class="mt-2.5 space-y-1.5">
                <p
                  v-for="(example, idx) in item.examples"
                  :key="`ex-${item.id}-${idx}`"
                  class="truncate border-l-2 border-[color-mix(in_srgb,var(--accent)_40%,var(--line))] pl-2.5 text-[11px] italic text-[var(--muted)]"
                >
                  {{ example }}
                </p>
              </div>
            </article>
          </div>

          <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 pt-1 text-xs">
            <button class="btn-icon h-8 w-8" :disabled="wordsQuery.isFetching.value || page <= 1" @click="goPrev">
              <span aria-hidden>‹</span>
            </button>
            <span class="font-medium text-[var(--muted)]">{{ t.common.page() }} {{ page }} {{ t.common.of() }} {{ totalPages }}</span>
            <button class="btn-icon h-8 w-8" :disabled="wordsQuery.isFetching.value || page >= totalPages" @click="goNext">
              <span aria-hidden>›</span>
            </button>
          </div>
        </section>
      </div>
    </section>
  </AppContainer>
</template>
