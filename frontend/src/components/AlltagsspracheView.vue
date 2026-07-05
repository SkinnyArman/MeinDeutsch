<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import { CheckCircle2, ChevronDown, ChevronUp, CircleHelp, History, Lightbulb, Loader2, MessageCircleQuestion, MessageSquareText, Send, Sparkles, XCircle } from "lucide-vue-next";
import type { ExpressionAttemptHistoryPoint, ExpressionAttemptRecord, ExpressionPromptRecord } from "@/types/ApiTypes";
import AppContainer from "./AppContainer.vue";
import ScoreRing from "./ScoreRing.vue";
import {
  type AlltagCategory,
  useAlltagAttemptMutation,
  useAlltagCategoriesQuery,
  useAlltagHistoryInfiniteQuery,
  useAlltagNextPromptMutation,
  useAlltagRecognitionMutation
} from "@/queries/alltag";
import { ALLTAG_IDK_ANSWER } from "@/constants/app";

const { t } = useLanguage();
const router = useRouter();
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);

const prompt = ref<ExpressionPromptRecord | null>(null);
const latestAttempt = ref<ExpressionAttemptRecord | null>(null);
const showHint = ref(false);
const expandedHistoryId = ref<number | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);
const selectedCategory = ref<AlltagCategory>("random");

// Recognition (MCQ) phase state.
const selectedOption = ref<string | null>(null);
const recognitionResult = ref<{ correct: boolean; correctAnswer: string } | null>(null);

const form = reactive({
  userAnswerText: ""
});

const historyQuery = useAlltagHistoryInfiniteQuery();
const categoriesQuery = useAlltagCategoriesQuery();
const nextPromptMutation = useAlltagNextPromptMutation();
const attemptMutation = useAlltagAttemptMutation();
const recognitionMutation = useAlltagRecognitionMutation();
const isPromptLoading = computed(() => nextPromptMutation.isPending.value);
const isRecognition = computed(() => prompt.value?.mode === "recognition" && (prompt.value?.options?.length ?? 0) > 0);

const historyItems = computed(() => historyQuery.data.value?.pages.flatMap((page) => page.items) ?? []);
const hasMoreHistory = computed(() => Boolean(historyQuery.hasNextPage.value));
const hasFeedback = computed(() => Boolean(latestAttempt.value?.feedback?.trim()));
const hasNativeLike = computed(() => Boolean(latestAttempt.value?.nativeLikeVersion?.trim()));
const hasAlternatives = computed(() => (latestAttempt.value?.alternatives?.length ?? 0) > 0);
const alltagCategories = computed<Array<{ value: AlltagCategory; label: string }>>(() => {
  const apiCategories = categoriesQuery.data.value ?? [];
  if (apiCategories.length > 0) {
    return apiCategories.map((category) => ({ value: category.id, label: category.label }));
  }
  return [{ value: "random", label: t.alltag.categoryRandom() }];
});

const previousAttemptScores = (attemptHistory: ExpressionAttemptHistoryPoint[], currentId: number): number[] => {
  return attemptHistory
    .filter((point) => point.id !== currentId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
    .map((point) => point.naturalnessScore);
};

const previousAnswers = (attemptHistory: ExpressionAttemptHistoryPoint[], currentId: number): Array<{ answer: string; score: number; at: string }> => {
  return attemptHistory
    .filter((item) => item.id !== currentId)
    .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
    .map((item) => ({
      answer: item.userAnswerText,
      score: item.naturalnessScore,
      at: item.createdAt
    }));
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
  if (recognitionMutation.error.value) {
    notice.value = { type: "error", text: recognitionMutation.error.value.message };
  }
});

const ensurePromptForCategory = async (category: AlltagCategory): Promise<void> => {
  const generated = await nextPromptMutation.mutateAsync({ category });
  prompt.value = generated;
  showHint.value = false;
  selectedOption.value = null;
  recognitionResult.value = null;
};

const handleNext = async (): Promise<void> => {
  latestAttempt.value = null;
  form.userAnswerText = "";
  await ensurePromptForCategory(selectedCategory.value);
};

const chooseOption = async (option: string): Promise<void> => {
  if (!prompt.value || recognitionResult.value || recognitionMutation.isPending.value) {
    return;
  }
  selectedOption.value = option;
  const data = await recognitionMutation.mutateAsync({
    promptId: prompt.value.id,
    chosenText: option
  });
  recognitionResult.value = { correct: data.correct, correctAnswer: data.correctAnswer };
};

const optionState = (option: string): "idle" | "correct" | "wrong" | "missed" => {
  if (!recognitionResult.value) {
    return "idle";
  }
  if (option === recognitionResult.value.correctAnswer) {
    return "correct";
  }
  if (option === selectedOption.value) {
    return "wrong";
  }
  return "missed";
};

const submitAttempt = async (userAnswerText: string) => {
  if (!prompt.value) {
    notice.value = { type: "error", text: t.alltag.promptFailed() };
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

const beforeEnter = (el: Element): void => {
  const node = el as HTMLElement;
  node.style.height = "0px";
  node.style.opacity = "0";
  node.style.transform = "translateY(-4px)";
  node.style.overflow = "hidden";
};

const enter = (el: Element): void => {
  const node = el as HTMLElement;
  node.style.transition = "height 220ms ease, opacity 220ms ease, transform 220ms ease";
  requestAnimationFrame(() => {
    node.style.height = `${node.scrollHeight}px`;
    node.style.opacity = "1";
    node.style.transform = "translateY(0)";
  });
};

const afterEnter = (el: Element): void => {
  const node = el as HTMLElement;
  node.style.height = "auto";
  node.style.overflow = "visible";
  node.style.transition = "";
};

const beforeLeave = (el: Element): void => {
  const node = el as HTMLElement;
  node.style.height = `${node.scrollHeight}px`;
  node.style.opacity = "1";
  node.style.transform = "translateY(0)";
  node.style.overflow = "hidden";
};

const leave = (el: Element): void => {
  const node = el as HTMLElement;
  node.style.transition = "height 220ms ease, opacity 220ms ease, transform 220ms ease";
  requestAnimationFrame(() => {
    node.style.height = "0px";
    node.style.opacity = "0";
    node.style.transform = "translateY(-4px)";
  });
};

const afterLeave = (el: Element): void => {
  const node = el as HTMLElement;
  node.style.transition = "";
  node.style.overflow = "visible";
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
    if (!alltagCategories.value.some((category) => category.value === selectedCategory.value)) {
      selectedCategory.value = alltagCategories.value[0]?.value ?? "random";
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
          <h1 class="page-title">{{ t.alltag.title() }}</h1>
          <p class="page-subtitle">{{ t.alltag.subtitle() }}</p>
        </div>
        <div class="flex w-full items-center gap-2 sm:w-auto">
          <select v-model="selectedCategory" class="input h-10 flex-1 px-3 py-0 text-xs sm:w-40 sm:flex-none">
            <option
              v-for="category in alltagCategories"
              :key="category.value"
              :value="category.value"
            >
              {{ category.label }}
            </option>
          </select>
          <button class="btn-ghost h-10 px-3 text-xs" type="button" @click="router.push('/alltagssprache/review')">
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
              <MessageCircleQuestion v-else class="h-3 w-3" />
            </span>
            {{ t.alltag.situationPrompt() }}
          </span>
          <span class="flex items-center gap-2">
            <span
              v-if="prompt && !isPromptLoading"
              class="chip-accent text-[10px] uppercase tracking-wide"
            >
              {{ isRecognition ? t.alltag.modeRecognize() : t.alltag.modeProduce() }}
            </span>
            <span v-if="prompt?.generationCategory && prompt.generationCategory !== 'random'" class="chip hidden sm:inline-flex">{{ prompt.generationCategory }}</span>
          </span>
        </div>

        <!-- Situational prompt leads; older prompts without a situation fall back to the English expression. -->
        <p class="mt-4 font-serif text-2xl leading-snug sm:text-3xl">
          <span v-if="isPromptLoading" class="inline-flex items-center gap-2 text-sm font-sans text-[var(--muted)]">
            <Loader2 class="h-4 w-4 animate-spin text-[var(--accent)]" />
            {{ t.common.loading() }}
          </span>
          <template v-else-if="prompt?.situationText">{{ prompt.situationText }}</template>
          <template v-else>{{ prompt?.englishText ? `“${prompt.englishText}”` : t.common.loading() }}</template>
        </p>

        <!-- English hint, hidden until requested, so the user produces from the situation first.
             Suppressed during recognition since the options already reveal the wording. -->
        <div v-if="!isRecognition && prompt?.situationText && prompt?.englishText" class="mt-4">
          <button
            v-if="!showHint"
            type="button"
            class="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--muted)] transition hover:text-[var(--accent)]"
            @click="showHint = true"
          >
            <Lightbulb class="h-3.5 w-3.5" />
            {{ t.alltag.showHint() }}
          </button>
          <p v-else class="inline-flex items-center gap-2 rounded-lg bg-[var(--panel-soft)] px-3 py-1.5 text-sm text-[var(--muted)]">
            <Lightbulb class="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" />
            <span><span class="font-medium text-[var(--text)]">{{ prompt.englishText }}</span></span>
          </p>
        </div>
      </div>

      <!-- Recognition phase: pick the natural option. -->
      <div v-if="isRecognition" class="space-y-2">
        <label class="eyebrow">{{ t.alltag.pickNatural() }}</label>
        <div class="grid gap-2">
          <button
            v-for="(option, i) in prompt?.options ?? []"
            :key="`opt-${i}`"
            type="button"
            class="flex items-center gap-3 rounded-xl border px-4 py-3 text-left text-sm transition-all duration-150 disabled:cursor-default"
            :class="{
              'border-[var(--line)] bg-[var(--panel)] hover:border-[var(--accent)] hover:bg-[var(--panel-soft)]': optionState(option) === 'idle',
              'border-[var(--status-good)] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))] text-[var(--status-good)] font-semibold': optionState(option) === 'correct',
              'border-[var(--status-bad)] bg-[color-mix(in_srgb,var(--status-bad)_12%,var(--panel))] text-[var(--status-bad)]': optionState(option) === 'wrong',
              'border-[var(--line)] bg-[var(--panel)] opacity-50': optionState(option) === 'missed'
            }"
            :disabled="Boolean(recognitionResult) || recognitionMutation.isPending.value"
            @click="chooseOption(option)"
          >
            <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-md border border-[var(--line)] text-[11px] font-bold">
              {{ String.fromCharCode(65 + i) }}
            </span>
            <span class="min-w-0 flex-1">{{ option }}</span>
            <CheckCircle2 v-if="optionState(option) === 'correct'" class="h-4 w-4 shrink-0" />
            <XCircle v-else-if="optionState(option) === 'wrong'" class="h-4 w-4 shrink-0" />
          </button>
        </div>

        <div v-if="recognitionResult" class="animate-fade-up pt-1">
          <p class="text-sm font-medium" :class="recognitionResult.correct ? 'text-[var(--status-good)]' : 'text-[var(--status-bad)]'">
            {{ recognitionResult.correct ? t.alltag.recognizeRight() : t.alltag.recognizeWrong() }}
          </p>
          <p class="mt-1 text-xs text-[var(--muted)]">{{ t.alltag.produceLaterHint() }}</p>
          <button class="btn-primary mt-3 w-full sm:w-auto" :disabled="isPromptLoading" @click="handleNext">
            <Loader2 v-if="isPromptLoading" class="h-4 w-4 animate-spin" />
            <span v-else>{{ t.common.next() }}</span>
          </button>
        </div>
      </div>

      <!-- Production phase: produce the German from the situation. -->
      <div v-else class="space-y-2">
        <label class="eyebrow">{{ t.alltag.answerPrompt() }}</label>
        <div class="relative">
          <textarea
            v-model="form.userAnswerText"
            class="input min-h-[96px] resize-y pb-14 sm:pb-3 sm:pr-36"
            :placeholder="t.alltag.answerPlaceholder()"
            @keydown.enter.meta.prevent="handleSubmit"
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
            <ScoreRing
              :score="latestAttempt.naturalnessScore"
              :label="scoreLabel(latestAttempt.naturalnessScore)"
              class="shrink-0"
            />
          </div>
        </div>

        <div v-if="hasNativeLike" class="card border-[color-mix(in_srgb,var(--status-good)_30%,var(--line))] p-5">
          <span class="eyebrow text-[var(--status-good)]">
            <CheckCircle2 class="h-3.5 w-3.5" />
            {{ t.alltag.nativeLike() }}
          </span>
          <p class="panel-inset mt-3 px-4 py-3 font-serif text-lg">{{ latestAttempt.nativeLikeVersion }}</p>
        </div>

        <div v-if="hasAlternatives" class="card p-5">
          <span class="eyebrow">
            <span class="eyebrow-icon"><Sparkles class="h-3 w-3" /></span>
            {{ t.alltag.alternatives() }}
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
        <div v-if="historyQuery.isFetching.value && !historyQuery.data.value" class="card flex items-center gap-2 p-4 text-xs text-[var(--muted)]">
          <Loader2 class="h-3.5 w-3.5 animate-spin text-[var(--accent)]" />
          {{ t.common.loading() }}
        </div>
        <div v-else-if="!historyItems.length" class="card border-dashed p-4 text-xs text-[var(--muted)]">
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
                <p class="truncate text-sm font-semibold">{{ `“${item.englishText}”` }}</p>
                <p class="mt-0.5 truncate text-xs text-[var(--muted)]">{{ item.userAnswerText }}</p>
              </div>
              <span class="inline-flex items-center gap-2 self-center">
                <span class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold" :class="[scoreBadgeTone(item.naturalnessScore), scoreTone(item.naturalnessScore)]">
                  {{ item.naturalnessScore }}%
                </span>
                <ChevronDown v-if="expandedHistoryId !== item.id" class="h-3.5 w-3.5 text-[var(--muted)]" />
                <ChevronUp v-else class="h-3.5 w-3.5 text-[var(--muted)]" />
              </span>
            </button>

            <transition
              @before-enter="beforeEnter"
              @enter="enter"
              @after-enter="afterEnter"
              @before-leave="beforeLeave"
              @leave="leave"
              @after-leave="afterLeave"
            >
              <div
                v-if="expandedHistoryId === item.id"
                class="panel-inset mt-3 space-y-3 p-3.5 text-xs text-[var(--muted)]"
              >
                <div v-if="previousAttemptScores(item.attemptHistory, item.id).length > 0">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.alltag.attempts() }}</p>
                  <div class="mt-1 flex flex-wrap gap-1.5">
                    <span
                      v-for="(score, idx) in previousAttemptScores(item.attemptHistory, item.id)"
                      :key="`${item.id}-prev-score-${idx}-${score}`"
                      class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
                      :class="[scoreBadgeTone(score), scoreTone(score)]"
                    >
                      {{ score }}%
                    </span>
                  </div>
                </div>
                <div v-if="previousAnswers(item.attemptHistory, item.id).length > 0">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.alltag.previousAnswers() }}</p>
                  <ul class="mt-1 space-y-1.5">
                    <li
                      v-for="(entry, idx) in previousAnswers(item.attemptHistory, item.id)"
                      :key="`${item.id}-prev-answer-${idx}-${entry.at}`"
                      class="flex items-start justify-between gap-2 border-l-2 border-[color-mix(in_srgb,var(--accent)_50%,var(--line))] pl-2"
                    >
                      <span class="text-[var(--text)]">{{ entry.answer }}</span>
                      <span class="shrink-0 text-[10px] font-semibold" :class="scoreTone(entry.score)">
                        {{ entry.score }}%
                      </span>
                    </li>
                  </ul>
                </div>
                <p v-if="item.feedback">{{ item.feedback }}</p>
                <div v-if="item.nativeLikeVersion">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.alltag.nativeLike() }}</p>
                  <p class="mt-1 border-l-2 border-[color-mix(in_srgb,var(--accent)_50%,var(--line))] pl-2 text-sm text-[var(--text)]">{{ item.nativeLikeVersion }}</p>
                </div>
                <div v-if="item.alternatives.length">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.alltag.alternatives() }}</p>
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
            </transition>
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
