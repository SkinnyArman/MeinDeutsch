<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  CircleHelp,
  History,
  Languages,
  Loader2,
  MessageSquareText,
  Puzzle,
  Send,
  Sparkles
} from "lucide-vue-next";
import type { CollocationAttemptHistoryPoint, CollocationAttemptRecord, CollocationPromptRecord } from "@/types/ApiTypes";
import AppContainer from "./AppContainer.vue";
import ScoreRing from "./ScoreRing.vue";
import {
  type CollocationCategory,
  useCollocationAttemptMutation,
  useCollocationCategoriesQuery,
  useCollocationHistoryInfiniteQuery,
  useCollocationNextPromptMutation
} from "@/queries/collocations";
import { ALLTAG_IDK_ANSWER } from "@/constants/app";

const { t } = useLanguage();
const router = useRouter();
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);

const prompt = ref<CollocationPromptRecord | null>(null);
const latestAttempt = ref<CollocationAttemptRecord | null>(null);
const expandedHistoryId = ref<number | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);
const selectedCategory = ref<CollocationCategory>("random");

const form = reactive({
  userAnswerText: ""
});

const historyQuery = useCollocationHistoryInfiniteQuery();
const categoriesQuery = useCollocationCategoriesQuery();
const nextPromptMutation = useCollocationNextPromptMutation();
const attemptMutation = useCollocationAttemptMutation();
const isPromptLoading = computed(() => nextPromptMutation.isPending.value);

const historyItems = computed(() => historyQuery.data.value?.pages.flatMap((page) => page.items) ?? []);
const hasMoreHistory = computed(() => Boolean(historyQuery.hasNextPage.value));
const hasFeedback = computed(() => Boolean(latestAttempt.value?.feedback?.trim()));
const hasAlternatives = computed(() => (latestAttempt.value?.alternatives?.length ?? 0) > 0);

const categories = computed<Array<{ value: CollocationCategory; label: string }>>(() => {
  const apiCategories = categoriesQuery.data.value ?? [];
  if (apiCategories.length > 0) {
    return apiCategories.map((category) => ({ value: category.id, label: category.label }));
  }
  return [{ value: "random", label: "Random" }];
});

const GAP_PATTERN = /_{2,}/;

// Split the cloze sentence around the gap so it can be styled.
const clozeParts = computed(() => {
  const sentence = prompt.value?.clozeSentence ?? "";
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

// Completed sentence with the correct collocation filled in, for the result card.
const solvedSentence = computed(() => {
  if (!latestAttempt.value) {
    return "";
  }
  return latestAttempt.value.clozeSentence.replace(GAP_PATTERN, latestAttempt.value.correctVersion);
});

const previousAnswers = (attemptHistory: CollocationAttemptHistoryPoint[], currentId: number): Array<{ answer: string; score: number; at: string }> => {
  return attemptHistory
    .filter((item) => item.id !== currentId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((item) => ({ answer: item.userAnswerText, score: item.score, at: item.createdAt }));
};

watchEffect(() => {
  if (categoriesQuery.error.value) {
    notice.value = { type: "error", text: categoriesQuery.error.value.message };
  }
  if (historyQuery.error.value) {
    notice.value = { type: "error", text: historyQuery.error.value.message };
  }
  if (nextPromptMutation.error.value) {
    notice.value = { type: "error", text: nextPromptMutation.error.value.message };
  }
  if (attemptMutation.error.value) {
    notice.value = { type: "error", text: attemptMutation.error.value.message };
  }
});

const ensurePromptForCategory = async (category: CollocationCategory): Promise<void> => {
  const generated = await nextPromptMutation.mutateAsync({ category });
  prompt.value = generated;
};

const handleNext = async (): Promise<void> => {
  latestAttempt.value = null;
  form.userAnswerText = "";
  await ensurePromptForCategory(selectedCategory.value);
};

const submitAttempt = async (userAnswerText: string) => {
  if (!prompt.value) {
    notice.value = { type: "error", text: t.kollok.promptFailed() };
    return;
  }
  const data = await attemptMutation.mutateAsync({
    promptId: prompt.value.id,
    userAnswerText
  });
  latestAttempt.value = data;
  historyQuery.refetch();
};

const handleSubmit = async () => {
  const userAnswerText = form.userAnswerText.trim();
  if (!userAnswerText) {
    return;
  }
  await submitAttempt(userAnswerText);
};

const handleIDontKnow = async () => {
  form.userAnswerText = ALLTAG_IDK_ANSWER;
  await submitAttempt(ALLTAG_IDK_ANSWER);
};

const toggleHistoryItem = (id: number) => {
  expandedHistoryId.value = expandedHistoryId.value === id ? null : id;
};

const scoreLabel = (score: number): string => {
  if (score >= 85) {
    return t.alltag.scoreExcellent();
  }
  if (score >= 65) {
    return t.alltag.scoreGood();
  }
  if (score >= 45) {
    return t.alltag.scoreAlmost();
  }
  return t.alltag.scoreKeepGoing();
};

const scoreTone = (score: number): string => {
  if (score >= 85) {
    return "text-[var(--status-good)]";
  }
  if (score >= 65) {
    return "text-[var(--accent)]";
  }
  if (score >= 45) {
    return "text-[var(--status-warn)]";
  }
  return "text-[var(--status-bad)]";
};

const scoreBadgeTone = (score: number): string => {
  if (score >= 85) {
    return "border-[color-mix(in_srgb,var(--status-good)_55%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_20%,var(--panel-soft))]";
  }
  if (score >= 65) {
    return "border-[color-mix(in_srgb,var(--accent)_55%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_20%,var(--panel-soft))]";
  }
  if (score >= 45) {
    return "border-[color-mix(in_srgb,var(--status-warn)_55%,var(--line))] bg-[color-mix(in_srgb,var(--status-warn)_20%,var(--panel-soft))]";
  }
  return "border-[color-mix(in_srgb,var(--status-bad)_55%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_20%,var(--panel-soft))]";
};

onMounted(() => {
  void (async () => {
    await categoriesQuery.refetch();
    if (!categories.value.some((category) => category.value === selectedCategory.value)) {
      selectedCategory.value = categories.value[0]?.value ?? "random";
    }
    await ensurePromptForCategory(selectedCategory.value);
  })();

  const observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && hasMoreHistory.value && !historyQuery.isFetchingNextPage.value) {
      void historyQuery.fetchNextPage();
    }
  });

  if (loadMoreSentinel.value) {
    observer.observe(loadMoreSentinel.value);
  }
});

watch(selectedCategory, async (nextCategory) => {
  latestAttempt.value = null;
  form.userAnswerText = "";
  await ensurePromptForCategory(nextCategory);
});
</script>

<template>
  <AppContainer size="sm">
    <div class="animate-fade-up space-y-6">
      <div class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="page-title">{{ t.kollok.title() }}</h1>
          <p class="page-subtitle">{{ t.kollok.subtitle() }}</p>
        </div>
        <div class="flex w-full items-center gap-2 sm:w-auto">
          <select v-model="selectedCategory" class="input h-10 flex-1 px-3 py-0 text-xs sm:w-44 sm:flex-none">
            <option v-for="category in categories" :key="category.value" :value="category.value">
              {{ category.label }}
            </option>
          </select>
          <button class="btn-ghost h-10 px-3 text-xs" type="button" @click="router.push('/kollokationen/review')">
            <History class="h-3.5 w-3.5" />
            {{ t.alltag.review() }}
          </button>
          <button class="btn-soft h-10 px-4 text-xs" type="button" :disabled="isPromptLoading" @click="handleNext">
            <Loader2 v-if="isPromptLoading" class="h-3.5 w-3.5 animate-spin" />
            <span v-else>{{ t.common.next() }}</span>
          </button>
        </div>
      </div>

      <p v-if="notice" :class="notice.type === 'error' ? 'notice-error' : 'notice-success'">
        {{ notice.text }}
      </p>

      <div class="card-hero p-5 sm:p-6">
        <div class="flex items-center justify-between">
          <span class="eyebrow">
            <span class="eyebrow-icon">
              <Loader2 v-if="isPromptLoading" class="h-3 w-3 animate-spin" />
              <Puzzle v-else class="h-3 w-3" />
            </span>
            {{ t.kollok.fillTheGap() }}
          </span>
          <span v-if="prompt?.collocationType" class="chip hidden sm:inline-flex">{{ prompt.collocationType.replace("_", " + ") }}</span>
        </div>

        <p class="mt-4 font-serif text-xl leading-relaxed sm:text-2xl">
          <template v-if="prompt && !isPromptLoading">
            {{ clozeParts.before }}<span
              v-if="clozeParts.hasGap"
              class="mx-1 inline-block min-w-[90px] rounded-lg border-b-2 border-dashed border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_10%,transparent)] px-3 text-center align-baseline text-[var(--accent-strong)]"
            >&nbsp;?&nbsp;</span>{{ clozeParts.after }}
          </template>
          <template v-else>{{ t.common.loading() }}</template>
        </p>

        <div v-if="prompt && !isPromptLoading" class="mt-4 flex items-center gap-2">
          <span class="eyebrow-icon shrink-0"><Languages class="h-3 w-3" /></span>
          <p class="text-sm font-semibold text-[var(--accent-strong)]">{{ prompt.englishText }}</p>
        </div>
      </div>

      <div class="space-y-2">
        <label class="eyebrow">{{ t.kollok.answerPrompt() }}</label>
        <div class="relative">
          <textarea
            v-model="form.userAnswerText"
            class="input min-h-[72px] resize-y pb-14 sm:pb-3 sm:pr-36"
            :placeholder="t.kollok.answerPlaceholder()"
            @keydown.enter.exact.prevent="handleSubmit"
          />
          <div class="absolute bottom-3 right-3 flex items-center gap-2">
            <button
              class="btn-ghost h-9 px-2.5 text-[11px]"
              :disabled="!prompt || attemptMutation.isPending.value"
              @click="handleIDontKnow"
            >
              <CircleHelp class="h-3.5 w-3.5" />
              <span>{{ t.alltag.idk() }}</span>
            </button>
            <button
              class="btn-primary h-9 w-9 rounded-xl p-0"
              :disabled="!form.userAnswerText.trim() || attemptMutation.isPending.value"
              @click="handleSubmit"
            >
              <Loader2 v-if="attemptMutation.isPending.value" class="h-4 w-4 animate-spin" />
              <Send v-else class="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div v-if="latestAttempt" class="animate-fade-up space-y-4">
        <div class="card p-5">
          <div class="flex flex-col-reverse items-center gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div class="min-w-0 flex-1">
              <span class="eyebrow">
                <span class="eyebrow-icon"><MessageSquareText class="h-3 w-3" /></span>
                {{ t.alltag.feedback() }}
              </span>
              <p class="mt-3 text-sm leading-relaxed" :class="hasFeedback ? 'text-[var(--text)]' : 'text-[var(--muted)]'">
                {{ hasFeedback ? latestAttempt.feedback : t.alltagReview.naturalFallback() }}
              </p>
            </div>
            <ScoreRing :score="latestAttempt.score" :label="scoreLabel(latestAttempt.score)" class="shrink-0" />
          </div>
        </div>

        <div class="card border-[color-mix(in_srgb,var(--status-good)_30%,var(--line))] p-5">
          <span class="eyebrow text-[var(--status-good)]">
            <CheckCircle2 class="h-3.5 w-3.5" />
            {{ t.kollok.correctAnswer() }}
          </span>
          <p class="panel-inset mt-3 px-4 py-3 font-serif text-lg">{{ latestAttempt.germanText }}</p>
          <p class="mt-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.kollok.inContext() }}</p>
          <p class="mt-1.5 text-sm leading-relaxed text-[var(--muted)]">{{ solvedSentence }}</p>
        </div>

        <div v-if="hasAlternatives" class="card p-5">
          <span class="eyebrow">
            <span class="eyebrow-icon"><Sparkles class="h-3 w-3" /></span>
            {{ t.kollok.alternatives() }}
          </span>
          <div class="mt-3 space-y-2">
            <div
              v-for="(alt, i) in latestAttempt.alternatives"
              :key="`${latestAttempt.id}-${i}`"
              class="panel-inset flex items-center gap-3 px-4 py-2.5 text-sm"
            >
              <span class="text-[11px] font-bold text-[var(--accent)]">{{ i + 1 }}</span>
              {{ alt }}
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div class="eyebrow">
          <span class="eyebrow-icon"><History class="h-3 w-3" /></span>
          {{ t.alltag.history() }}
        </div>
        <div v-if="!historyItems.length && !historyQuery.isFetching.value" class="card border-dashed p-4 text-xs text-[var(--muted)]">
          {{ t.dailyTalk.noHistory() }}
        </div>
        <div class="space-y-2">
          <div
            v-for="item in historyItems"
            :key="item.id"
            class="card card-hover p-3.5"
            :class="expandedHistoryId === item.id ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--line))]' : ''"
          >
            <button class="flex w-full items-start justify-between gap-3 text-left" type="button" @click="toggleHistoryItem(item.id)">
              <div class="min-w-0">
                <p class="truncate text-sm font-semibold">{{ item.germanText }}</p>
                <p class="mt-0.5 truncate text-xs text-[var(--muted)]">{{ item.englishText }}</p>
              </div>
              <span class="inline-flex items-center gap-2 self-center">
                <span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold" :class="[scoreBadgeTone(item.score), scoreTone(item.score)]">
                  {{ item.score }}%
                </span>
                <ChevronDown v-if="expandedHistoryId !== item.id" class="h-3.5 w-3.5 text-[var(--muted)]" />
                <ChevronUp v-else class="h-3.5 w-3.5 text-[var(--muted)]" />
              </span>
            </button>

            <div v-if="expandedHistoryId === item.id" class="panel-inset mt-3 space-y-3 p-3.5 text-xs text-[var(--muted)]">
              <p class="text-sm text-[var(--text)]">{{ item.clozeSentence.replace(/_{2,}/, item.correctVersion) }}</p>
              <div v-if="previousAnswers(item.attemptHistory, item.id).length > 0">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.alltag.previousAnswers() }}</p>
                <ul class="mt-1 space-y-1.5">
                  <li
                    v-for="(entry, idx) in previousAnswers(item.attemptHistory, item.id)"
                    :key="`${item.id}-prev-${idx}-${entry.at}`"
                    class="flex items-start justify-between gap-2 border-l-2 border-[color-mix(in_srgb,var(--accent)_50%,var(--line))] pl-2"
                  >
                    <span class="text-[var(--text)]">{{ entry.answer }}</span>
                    <span class="shrink-0 text-[10px] font-semibold" :class="scoreTone(entry.score)">{{ entry.score }}%</span>
                  </li>
                </ul>
              </div>
              <p v-if="item.feedback">{{ item.feedback }}</p>
              <div v-if="item.alternatives.length">
                <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.kollok.alternatives() }}</p>
                <ul class="mt-1 space-y-1">
                  <li
                    v-for="(alt, idx) in item.alternatives"
                    :key="`${item.id}-alt-${idx}`"
                    class="border-l-2 border-[color-mix(in_srgb,var(--accent)_50%,var(--line))] pl-2"
                  >
                    {{ alt }}
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
        <div ref="loadMoreSentinel" class="h-6" />
        <button
          v-if="hasMoreHistory"
          class="btn-ghost w-full text-xs text-[var(--muted)]"
          :disabled="historyQuery.isFetchingNextPage.value"
          @click="historyQuery.fetchNextPage()"
        >
          {{ historyQuery.isFetchingNextPage.value ? t.common.loading() : t.common.next() }}
        </button>
      </div>
    </div>
  </AppContainer>
</template>
