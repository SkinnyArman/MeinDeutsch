<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, Flame, GraduationCap, Sparkles, TrendingUp } from "lucide-vue-next";
import { useLanguage } from "@/libs/i18n";
import { useProgressQuery } from "@/queries/progress";
import AppContainer from "./AppContainer.vue";
import Sparkline from "./Sparkline.vue";

const router = useRouter();
const { t } = useLanguage();
const query = useProgressQuery();
const p = computed(() => query.data.value ?? null);

const isReady = computed(() => Boolean(p.value?.nextLevel) && (p.value?.readinessPercent ?? 0) >= 80);

const dimensions = computed(() => {
  const b = p.value?.breakdown;
  if (!b) {
    return [];
  }
  return [
    { key: "accuracy", label: t.progress.accuracy(), value: b.accuracy },
    { key: "production", label: t.progress.production(), value: b.production },
    { key: "consistency", label: t.progress.consistency(), value: b.consistency }
  ];
});
</script>

<template>
  <AppContainer>
    <section class="animate-fade-up space-y-6">
      <header>
        <button
          class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
          @click="router.push('/')"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          {{ t.common.back() }}
        </button>
        <h2 class="page-title">{{ t.progress.title() }}</h2>
        <p class="page-subtitle">{{ t.progress.subtitle() }}</p>
      </header>

      <div v-if="p" class="space-y-5">
        <!-- Level + readiness hero -->
        <div class="card-hero p-5 sm:p-6">
          <div class="flex flex-col gap-6 sm:flex-row sm:items-center sm:justify-between">
            <div class="flex items-center gap-4">
              <span class="eyebrow-icon h-14 w-14 rounded-2xl"><GraduationCap class="h-7 w-7" /></span>
              <div>
                <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.progress.currentLevel() }}</p>
                <p class="font-serif text-4xl font-semibold leading-none">{{ p.currentLevel ?? "—" }}</p>
              </div>
            </div>

            <!-- CEFR ladder -->
            <div class="flex items-center gap-1.5">
              <span
                v-for="lvl in ['A1', 'A2', 'B1', 'B2', 'C1', 'C2']"
                :key="lvl"
                class="rounded-lg px-2.5 py-1 text-xs font-bold transition"
                :class="lvl === p.currentLevel
                  ? 'bg-[var(--accent)] text-white'
                  : lvl === p.nextLevel
                    ? 'border border-dashed border-[var(--accent)] text-[var(--accent-strong)]'
                    : 'bg-[var(--panel-soft)] text-[var(--muted)]'"
              >
                {{ lvl }}
              </span>
            </div>
          </div>

          <!-- Readiness bar -->
          <div v-if="p.nextLevel" class="mt-6">
            <div class="flex items-center justify-between text-xs font-semibold">
              <span class="text-[var(--muted)]">{{ t.progress.readiness({ level: p.nextLevel }) }}</span>
              <span>{{ p.readinessPercent }}%</span>
            </div>
            <div class="mt-2 h-2.5 overflow-hidden rounded-full bg-[var(--panel-soft)]">
              <div
                class="h-full rounded-full transition-all duration-700"
                style="background-image: linear-gradient(90deg, var(--accent), var(--accent-strong))"
                :style="{ width: `${p.readinessPercent}%` }"
              />
            </div>
            <p class="mt-2 text-[11px] text-[var(--muted)]">{{ t.progress.readinessHint() }}</p>
          </div>
          <p v-else class="mt-6 text-sm text-[var(--muted)]">{{ t.progress.readinessMaxed() }}</p>

          <div
            v-if="isReady"
            class="mt-4 rounded-xl border border-[color-mix(in_srgb,var(--status-good)_40%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_10%,transparent)] p-3.5"
          >
            <p class="text-sm font-semibold text-[var(--status-good)]">{{ t.progress.readyTitle({ level: p.nextLevel }) }}</p>
            <p class="mt-1 text-xs text-[var(--muted)]">{{ t.progress.readyBody() }}</p>
          </div>
        </div>

        <!-- Breakdown -->
        <div class="grid grid-cols-3 gap-3">
          <div v-for="d in dimensions" :key="d.key" class="card p-4">
            <p class="font-serif text-2xl font-semibold sm:text-3xl">{{ d.value }}<span class="text-base text-[var(--muted)]">%</span></p>
            <p class="mt-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ d.label }}</p>
          </div>
        </div>

        <!-- Score trend -->
        <div class="card p-5">
          <span class="eyebrow"><span class="eyebrow-icon"><TrendingUp class="h-3 w-3" /></span>{{ t.progress.scoreTrend() }}</span>
          <div v-if="p.recentScores.length > 1" class="mt-4">
            <Sparkline :points="p.recentScores" :width="320" :height="60" />
          </div>
          <p v-else class="mt-3 text-sm text-[var(--muted)]">{{ t.progress.notEnough() }}</p>
        </div>

        <!-- Focus areas -->
        <div class="card p-5">
          <span class="eyebrow"><span class="eyebrow-icon"><Sparkles class="h-3 w-3" /></span>{{ t.progress.focusAreas() }}</span>
          <div v-if="p.topMistakes.length" class="mt-3 flex flex-wrap gap-2">
            <span v-for="m in p.topMistakes" :key="m.mistakeType" class="chip">
              {{ m.mistakeType }} · {{ m.frequency }}×
            </span>
          </div>
          <p v-else class="mt-3 text-sm text-[var(--muted)]">{{ t.progress.noMistakes() }}</p>
        </div>

        <!-- Footer stats -->
        <div class="flex flex-wrap items-center gap-2.5 text-xs text-[var(--muted)]">
          <span class="chip"><Flame class="h-3 w-3 text-amber-400" /> {{ t.progress.streakLine({ current: p.currentStreak, best: p.longestStreak }) }}</span>
          <span class="chip">{{ t.progress.activeDays({ count: p.activeDaysLast14 }) }}</span>
        </div>
      </div>

      <div v-else-if="query.isFetching.value" class="card p-10 text-center text-sm text-[var(--muted)]">
        {{ t.common.loading() }}
      </div>
    </section>
  </AppContainer>
</template>
