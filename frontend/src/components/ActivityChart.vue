<script setup lang="ts">
import { computed } from "vue";
import type { DashboardActivityDay } from "@/types/ApiTypes";

const props = defineProps<{
  days: DashboardActivityDay[];
  labels: { dailyTalk: string; alltagssprache: string; kollokationen: string; vocabulary: string; gespraech: string };
}>();

const SECTIONS = [
  { key: "dailyTalk", color: "var(--accent)" },
  { key: "alltagssprache", color: "#8b5cf6" },
  { key: "kollokationen", color: "#f59e0b" },
  { key: "gespraech", color: "#ec4899" },
  { key: "vocabulary", color: "#10b981" }
] as const;

const maxTotal = computed(() => {
  const totals = props.days.map(
    (day) => day.dailyTalk + day.alltagssprache + day.kollokationen + day.vocabulary + day.gespraech
  );
  return Math.max(1, ...totals);
});

const dayLabel = (date: string): string =>
  new Intl.DateTimeFormat("de-DE", { weekday: "short" }).format(new Date(`${date}T00:00:00Z`)).slice(0, 2);

const dayTotal = (day: DashboardActivityDay): number =>
  day.dailyTalk + day.alltagssprache + day.kollokationen + day.vocabulary + day.gespraech;

const segments = (day: DashboardActivityDay): Array<{ key: string; color: string; pct: number }> =>
  SECTIONS.map((section) => ({
    key: section.key,
    color: section.color,
    pct: (day[section.key] / maxTotal.value) * 100
  })).filter((segment) => segment.pct > 0);

const tooltip = (day: DashboardActivityDay): string =>
  `${day.date} · ${props.labels.dailyTalk}: ${day.dailyTalk} · ${props.labels.alltagssprache}: ${day.alltagssprache} · ${props.labels.kollokationen}: ${day.kollokationen} · ${props.labels.gespraech}: ${day.gespraech} · ${props.labels.vocabulary}: ${day.vocabulary}`;
</script>

<template>
  <div>
    <div class="flex h-36 items-end gap-1.5 sm:gap-2">
      <div
        v-for="day in days"
        :key="day.date"
        class="group flex h-full flex-1 flex-col items-center justify-end gap-1"
        :title="tooltip(day)"
      >
        <span
          v-if="dayTotal(day) > 0"
          class="text-[9px] font-bold text-[var(--muted)] opacity-0 transition group-hover:opacity-100"
        >
          {{ dayTotal(day) }}
        </span>
        <div class="flex w-full max-w-[22px] flex-col-reverse overflow-hidden rounded-md" style="height: calc(100% - 26px)">
          <div
            v-for="segment in segments(day)"
            :key="`${day.date}-${segment.key}`"
            class="w-full transition-all duration-500"
            :style="{ height: `${segment.pct}%`, backgroundColor: segment.color }"
          />
          <div v-if="dayTotal(day) === 0" class="h-[3px] w-full rounded-full bg-[var(--line)]" />
        </div>
        <span class="text-[9px] font-medium uppercase text-[var(--muted)]">{{ dayLabel(day.date) }}</span>
      </div>
    </div>

    <div class="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5">
      <span v-for="section in SECTIONS" :key="`legend-${section.key}`" class="inline-flex items-center gap-1.5 text-[11px] font-medium text-[var(--muted)]">
        <span class="h-2.5 w-2.5 rounded-sm" :style="{ backgroundColor: section.color }" />
        {{ labels[section.key] }}
      </span>
    </div>
  </div>
</template>
