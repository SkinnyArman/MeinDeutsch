<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Check,
  Flame,
  Languages,
  MessageCircle,
  Puzzle,
  Target
} from "lucide-vue-next";
import type { DailyGoalStepKey } from "@/types/ApiTypes";
import AppContainer from "./AppContainer.vue";
import ActivityChart from "./ActivityChart.vue";
import Sparkline from "./Sparkline.vue";
import { useDashboardOverviewQuery } from "@/queries/dashboard";

const router = useRouter();
const { t } = useLanguage();

const overviewQuery = useDashboardOverviewQuery({ refetchInterval: 60000 });
const overview = computed(() => overviewQuery.data.value ?? null);
const goal = computed(() => overview.value?.goal ?? null);

interface StepMeta {
  key: DailyGoalStepKey;
  label: string;
  icon: typeof MessageCircle;
  path: string;
}

const stepMeta = computed<StepMeta[]>(() => [
  { key: "dailyTalk", label: t.dailyTalk.title(), icon: MessageCircle, path: "/daily-talk/new" },
  { key: "alltagssprache", label: t.alltag.title(), icon: Languages, path: "/alltagssprache" },
  { key: "kollokationen", label: t.kollok.title(), icon: Puzzle, path: "/kollokationen" },
  { key: "vocabulary", label: t.vocab.title(), icon: BookOpen, path: "/vocabulary/review" }
]);

const steps = computed(() =>
  stepMeta.value.map((meta) => {
    const state = goal.value?.steps.find((step) => step.key === meta.key);
    return { ...meta, done: state?.done ?? false, countToday: state?.countToday ?? 0 };
  })
);

const formatRemaining = (ms: number): string => {
  const totalMinutes = Math.max(0, Math.floor(ms / 60000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return `${hours}h ${minutes}m`;
};

const remainingMs = computed(() => {
  const endAt = goal.value?.streak.windowEndAt;
  if (!endAt) {
    return 0;
  }
  return Math.max(0, new Date(endAt).getTime() - Date.now());
});

const activityHasData = computed(() =>
  (overview.value?.activity ?? []).some(
    (day) => day.dailyTalk + day.alltagssprache + day.kollokationen + day.vocabulary > 0
  )
);

const featureCards = computed(() => {
  const data = overview.value;
  return [
    {
      key: "dailyTalk",
      title: t.dailyTalk.title(),
      icon: MessageCircle,
      path: "/daily-talk",
      stat: t.dashboard.sessions({ count: data?.totals.dailyTalks ?? 0 }),
      sub: data?.latestCefrLevel ? `${t.dashboard.latestCefr()} · ${data.latestCefrLevel}` : null,
      due: 0,
      trend: null as number[] | null
    },
    {
      key: "alltagssprache",
      title: t.alltag.title(),
      icon: Languages,
      path: "/alltagssprache",
      stat: t.dashboard.sessions({ count: data?.totals.expressionAttempts ?? 0 }),
      sub: null,
      due: data?.due.alltagReview ?? 0,
      trend: data?.trends.alltag.map((point) => point.score) ?? null
    },
    {
      key: "kollokationen",
      title: t.kollok.title(),
      icon: Puzzle,
      path: "/kollokationen",
      stat: t.dashboard.sessions({ count: data?.totals.collocationAttempts ?? 0 }),
      sub: null,
      due: data?.due.kollokReview ?? 0,
      trend: data?.trends.kollok.map((point) => point.score) ?? null
    },
    {
      key: "vocabulary",
      title: t.vocab.title(),
      icon: BookOpen,
      path: "/vocabulary",
      stat: t.dashboard.words({ count: data?.totals.vocabularyWords ?? 0 }),
      sub: t.dashboard.reviewsDone({ count: data?.totals.vocabularyReviews ?? 0 }),
      due: data?.due.vocabulary ?? 0,
      trend: null
    }
  ];
});

const activityLabels = computed(() => ({
  dailyTalk: t.dailyTalk.title(),
  alltagssprache: t.alltag.title(),
  kollokationen: t.kollok.title(),
  vocabulary: t.vocab.title()
}));
</script>

<template>
  <AppContainer>
    <section class="animate-fade-up space-y-6">
      <header>
        <h2 class="page-title">{{ t.dashboard.title() }}</h2>
        <p class="page-subtitle">{{ t.dashboard.subtitle() }}</p>
      </header>

      <p v-if="overviewQuery.error.value" class="notice-error">
        {{ overviewQuery.error.value.message }}
      </p>

      <!-- Daily goal + streak hero -->
      <div class="card-hero p-5 sm:p-6">
        <div class="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
          <div class="min-w-0 flex-1">
            <span class="eyebrow">
              <span class="eyebrow-icon"><Target class="h-3 w-3" /></span>
              {{ t.dashboard.dailyGoal() }}
            </span>
            <p class="mt-2.5 font-serif text-xl font-semibold sm:text-2xl">
              {{ goal?.allDone
                ? t.dashboard.goalDone()
                : t.dashboard.goalProgress({ done: goal?.completedCount ?? 0, total: goal?.totalSteps ?? 4 }) }}
            </p>
            <p class="mt-1 text-xs text-[var(--muted)]">{{ t.dashboard.dailyGoalHint() }}</p>

            <!-- Stepper -->
            <div class="mt-6 grid grid-cols-2 gap-x-2 gap-y-5 sm:flex sm:items-start sm:gap-0">
              <template v-for="(step, index) in steps" :key="step.key">
                <button
                  class="group flex flex-1 flex-col items-center gap-2 text-center"
                  type="button"
                  @click="router.push(step.path)"
                >
                  <span
                    class="flex h-11 w-11 items-center justify-center rounded-full border-2 transition-all duration-200 group-hover:scale-105"
                    :class="step.done
                      ? 'border-[var(--status-good)] bg-[var(--status-good)] text-white shadow-[0_4px_14px_color-mix(in_srgb,var(--status-good)_40%,transparent)]'
                      : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] group-hover:border-[var(--accent)] group-hover:text-[var(--accent)]'"
                  >
                    <Check v-if="step.done" class="h-5 w-5" />
                    <component :is="step.icon" v-else class="h-5 w-5" />
                  </span>
                  <span class="text-[11px] font-semibold leading-tight" :class="step.done ? 'text-[var(--status-good)]' : 'text-[var(--muted)]'">
                    {{ step.label }}
                  </span>
                  <span v-if="step.countToday > 0" class="-mt-1 text-[10px] text-[var(--muted)]">
                    {{ t.dashboard.todayCount({ count: step.countToday }) }}
                  </span>
                </button>
                <span
                  v-if="index < steps.length - 1"
                  class="mt-[21px] hidden h-0.5 w-8 shrink-0 rounded-full sm:block lg:w-10"
                  :class="step.done && steps[index + 1]?.done ? 'bg-[var(--status-good)]' : 'bg-[var(--line)]'"
                />
              </template>
            </div>
          </div>

          <!-- Streak block -->
          <div class="flex shrink-0 items-center justify-center gap-5 lg:flex-col lg:items-end lg:gap-3">
            <div class="flex items-center gap-3">
              <span
                class="flex h-14 w-14 items-center justify-center rounded-2xl"
                :class="goal?.allDone
                  ? 'bg-[color-mix(in_srgb,var(--status-good)_16%,transparent)]'
                  : 'bg-[color-mix(in_srgb,#f59e0b_16%,transparent)]'"
              >
                <Flame class="h-7 w-7" :class="goal?.allDone ? 'text-[var(--status-good)]' : 'text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'" />
              </span>
              <div>
                <p class="font-serif text-4xl font-semibold leading-none">{{ goal?.streak.currentStreak ?? 0 }}</p>
                <p class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.dashboard.dayStreak() }}</p>
              </div>
            </div>
            <div class="flex flex-col items-start gap-1.5 lg:items-end">
              <span class="chip text-[10px]">{{ t.dashboard.longestStreak({ count: goal?.streak.longestStreak ?? 0 }) }}</span>
              <span
                v-if="!goal?.allDone"
                class="inline-flex items-center gap-1 rounded-full border border-[color-mix(in_srgb,var(--status-warn)_40%,var(--line))] bg-[color-mix(in_srgb,var(--status-warn)_10%,transparent)] px-2.5 py-1 text-[10px] font-bold text-[var(--status-warn)]"
              >
                {{ formatRemaining(remainingMs) }}
              </span>
            </div>
          </div>
        </div>
      </div>

      <!-- Feature cards -->
      <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <button
          v-for="card in featureCards"
          :key="card.key"
          class="card card-hover group flex flex-col p-4 text-left"
          type="button"
          @click="router.push(card.path)"
        >
          <div class="flex items-center justify-between">
            <span class="eyebrow-icon h-9 w-9 rounded-xl">
              <component :is="card.icon" class="h-4 w-4" />
            </span>
            <span
              v-if="card.due > 0"
              class="rounded-full border border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_10%,transparent)] px-2 py-0.5 text-[10px] font-bold text-[var(--status-bad)]"
            >
              {{ t.vocab.due({ count: card.due }) }}
            </span>
          </div>
          <p class="mt-3 text-sm font-bold">{{ card.title }}</p>
          <p class="mt-0.5 text-xs text-[var(--muted)]">{{ card.stat }}</p>
          <p v-if="card.sub" class="text-xs text-[var(--muted)]">{{ card.sub }}</p>
          <div class="mt-auto flex items-end justify-between pt-3">
            <Sparkline v-if="card.trend && card.trend.length > 1" :points="card.trend" :width="110" :height="32" />
            <span v-else />
            <ArrowRight class="h-4 w-4 shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
          </div>
        </button>
      </div>

      <!-- Activity chart -->
      <div class="card p-5">
        <span class="eyebrow">
          <span class="eyebrow-icon"><BarChart3 class="h-3 w-3" /></span>
          {{ t.dashboard.activity() }}
        </span>
        <div class="mt-5">
          <ActivityChart v-if="activityHasData && overview" :days="overview.activity" :labels="activityLabels" />
          <p v-else class="py-8 text-center text-sm text-[var(--muted)]">{{ t.dashboard.noActivity() }}</p>
        </div>
      </div>
    </section>
  </AppContainer>
</template>
