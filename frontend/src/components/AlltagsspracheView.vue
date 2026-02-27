<script setup lang="ts">
import { computed, onMounted, reactive, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import { CheckCircle2, ChevronDown, ChevronUp, Globe, History, Loader2, MessageSquareText, Plus, Send, Sparkles } from "lucide-vue-next";
import type { ExpressionAttemptRecord, ExpressionPromptRecord } from "@/types/ApiTypes";
import AppContainer from "./AppContainer.vue";
import {
  useAlltagAttemptMutation,
  useAlltagGeneratePromptMutation,
  useAlltagHistoryInfiniteQuery
} from "@/queries/alltag";

const { t } = useLanguage();
const router = useRouter();
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);

const prompt = ref<ExpressionPromptRecord | null>(null);
const latestAttempt = ref<ExpressionAttemptRecord | null>(null);
const expandedHistoryId = ref<number | null>(null);
const loadMoreSentinel = ref<HTMLElement | null>(null);

const form = reactive({
  userAnswerText: ""
});

const historyQuery = useAlltagHistoryInfiniteQuery();
const generateMutation = useAlltagGeneratePromptMutation();
const attemptMutation = useAlltagAttemptMutation();

const historyItems = computed(() => historyQuery.data.value?.pages.flatMap((page) => page.items) ?? []);
const hasMoreHistory = computed(() => Boolean(historyQuery.hasNextPage.value));

const scoreHistoryByExpression = computed<Record<string, Array<{ id: number; score: number; at: string }>>>(() => {
  const grouped: Record<string, Array<{ id: number; score: number; at: string }>> = {};
  for (const item of historyItems.value) {
    if (!grouped[item.englishText]) {
      grouped[item.englishText] = [];
    }
    grouped[item.englishText].push({
      id: item.id,
      score: item.naturalnessScore,
      at: item.createdAt
    });
  }
  return grouped;
});

const previousAttemptScores = (englishText: string, currentId: number): number[] => {
  const all = scoreHistoryByExpression.value[englishText] ?? [];
  return all
    .filter((point) => point.id !== currentId)
    .sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime())
    .map((point) => point.score);
};

watchEffect(() => {
  if (historyQuery.error.value) {
    notice.value = { type: "error", text: historyQuery.error.value.message };
  }
  if (generateMutation.error.value) {
    notice.value = { type: "error", text: generateMutation.error.value.message };
  }
  if (attemptMutation.error.value) {
    notice.value = { type: "error", text: attemptMutation.error.value.message };
  }
});

const handleGenerate = async () => {
  const data = await generateMutation.mutateAsync();
  prompt.value = data;
  latestAttempt.value = null;
  form.userAnswerText = "";
};

const handleSubmit = async () => {
  if (!prompt.value) {
    notice.value = { type: "error", text: t.alltag.promptFailed() };
    return;
  }
  const data = await attemptMutation.mutateAsync({
    promptId: prompt.value.id,
    userAnswerText: form.userAnswerText.trim()
  });
  latestAttempt.value = data;
  historyQuery.refetch();
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
  const observer = new IntersectionObserver((entries) => {
    if (entries[0]?.isIntersecting && hasMoreHistory.value && !historyQuery.isFetchingNextPage.value) {
      void historyQuery.fetchNextPage();
    }
  });

  if (loadMoreSentinel.value) {
    observer.observe(loadMoreSentinel.value);
  }
});
</script>

<template>
  <AppContainer size="sm">
    <div class="space-y-6">
      <div class="flex items-center justify-between">
        <div>
          <h1 class="font-serif text-2xl font-bold tracking-tight">{{ t.alltag.title() }}</h1>
          <p class="mt-1 text-sm text-[var(--muted)]">{{ t.alltag.subtitle() }}</p>
        </div>
        <div class="flex items-center gap-2">
          <button
            class="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--accent)]"
            type="button"
            @click="router.push('/alltagssprache/review')"
          >
            <History class="h-3.5 w-3.5" />
            {{ t.alltag.review() }}
          </button>
          <button
            class="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--accent)]"
            :disabled="generateMutation.isPending.value"
            @click="handleGenerate"
          >
            <Loader2 v-if="generateMutation.isPending.value" class="h-3.5 w-3.5 animate-spin" />
            <Plus v-else class="h-3.5 w-3.5" />
            {{ generateMutation.isPending.value ? t.alltag.generating() : t.alltag.newExpression() }}
          </button>
        </div>
      </div>

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

      <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          <Globe class="h-3.5 w-3.5" />
          <span>{{ t.alltag.expressInGerman() }}</span>
        </div>
        <p class="mt-3 font-serif text-2xl leading-relaxed">
          {{ prompt?.englishText ? `"${prompt.englishText}"` : t.alltag.newExpression() }}
        </p>
      </div>

      <div class="space-y-2">
        <label class="text-xs font-medium uppercase tracking-wide text-[var(--muted)]">{{ t.alltag.answerPrompt() }}</label>
        <div class="relative">
          <textarea
            v-model="form.userAnswerText"
            class="min-h-[80px] w-full rounded-lg border border-[var(--line)] bg-[var(--panel)] px-3 py-3 pr-12 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            :placeholder="t.alltag.answerPlaceholder()"
          />
          <button
            class="absolute bottom-3 right-3 inline-flex h-9 w-9 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel-soft)] transition hover:border-[var(--accent)] disabled:opacity-50"
            :disabled="!form.userAnswerText.trim() || attemptMutation.isPending.value"
            @click="handleSubmit"
          >
            <Send class="h-4 w-4" />
          </button>
        </div>
      </div>

      <div v-if="latestAttempt" class="space-y-4">
        <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            <MessageSquareText class="h-3.5 w-3.5" />
            {{ t.alltag.feedback() }}
          </div>
          <p class="mt-2 text-sm text-[var(--muted)]">{{ latestAttempt.feedback }}</p>
          <div class="mt-3 inline-flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-xs font-semibold" :class="[scoreBadgeTone(latestAttempt.naturalnessScore), scoreTone(latestAttempt.naturalnessScore)]">
            <span>{{ latestAttempt.naturalnessScore }}%</span>
          </div>
        </div>

        <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            <CheckCircle2 class="h-3.5 w-3.5 text-[var(--status-good)]" />
            {{ t.alltag.nativeLike() }}
          </div>
          <p class="mt-2 rounded-lg bg-[var(--panel-soft)] px-3 py-2 text-sm font-medium">{{ latestAttempt.nativeLikeVersion }}</p>
        </div>

        <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            <Sparkles class="h-3.5 w-3.5" />
            {{ t.alltag.alternatives() }}
          </div>
          <div class="mt-2 space-y-2">
            <div
              v-for="(alt, i) in latestAttempt.alternatives"
              :key="`${latestAttempt.id}-${i}`"
              class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
            >
              {{ alt }}
            </div>
          </div>
        </div>
      </div>

      <div class="space-y-3">
        <div class="flex items-center gap-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          <History class="h-3.5 w-3.5" />
          {{ t.alltag.history() }}
        </div>
        <div v-if="!historyItems.length && !historyQuery.isFetching.value" class="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-3 text-xs text-[var(--muted)]">
          {{ t.dailyTalk.noHistory() }}
        </div>
        <div class="space-y-2">
          <div
            v-for="item in historyItems"
            :key="item.id"
            class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]"
            :class="expandedHistoryId === item.id ? 'bg-[var(--panel-soft)]' : ''"
          >
            <button class="flex w-full items-start justify-between gap-3 text-left" type="button" @click="toggleHistoryItem(item.id)">
              <div class="min-w-0">
                <p class="truncate text-sm font-medium">{{ `"${item.englishText}"` }}</p>
                <p class="mt-1 truncate text-xs text-[var(--muted)]">{{ item.userAnswerText }}</p>
              </div>
              <span class="inline-flex items-center gap-2 self-center">
                <span class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-semibold" :class="[scoreBadgeTone(item.naturalnessScore), scoreTone(item.naturalnessScore)]">
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
                class="mt-3 space-y-3 rounded-lg border border-[var(--line)] bg-[color-mix(in_srgb,var(--panel)_90%,white)] p-3 text-xs text-[var(--muted)]"
              >
                <div v-if="previousAttemptScores(item.englishText, item.id).length > 0">
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.alltag.attempts() }}</p>
                  <div class="mt-1 flex flex-wrap gap-1.5">
                    <span
                      v-for="(score, idx) in previousAttemptScores(item.englishText, item.id)"
                      :key="`${item.id}-prev-score-${idx}-${score}`"
                      class="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[10px] font-semibold"
                      :class="[scoreBadgeTone(score), scoreTone(score)]"
                    >
                      {{ score }}%
                    </span>
                  </div>
                </div>
                <p>{{ item.feedback }}</p>
                <div>
                  <p class="text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.alltag.nativeLike() }}</p>
                  <p class="mt-1 border-l-2 border-[color-mix(in_srgb,var(--accent)_50%,var(--line))] pl-2 text-sm text-[var(--text)]">{{ item.nativeLikeVersion }}</p>
                </div>
                <div>
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
          class="w-full rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs text-[var(--muted)]"
          :disabled="historyQuery.isFetchingNextPage.value"
          @click="historyQuery.fetchNextPage()"
        >
          {{ historyQuery.isFetchingNextPage.value ? t.common.loading() : t.common.next() }}
        </button>
      </div>
    </div>
  </AppContainer>
</template>
