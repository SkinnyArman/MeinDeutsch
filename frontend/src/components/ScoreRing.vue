<script setup lang="ts">
import { computed, onMounted, ref } from "vue";

const props = withDefaults(
  defineProps<{
    score: number;
    size?: number;
    label?: string;
  }>(),
  {
    size: 104,
    label: ""
  }
);

const animatedScore = ref(0);

const STROKE_WIDTH = 8;

const radius = computed(() => (props.size - STROKE_WIDTH) / 2);
const circumference = computed(() => 2 * Math.PI * radius.value);
const dashOffset = computed(
  () => circumference.value * (1 - Math.max(0, Math.min(100, animatedScore.value)) / 100)
);

const tone = computed(() => {
  if (props.score >= 85) {
    return "var(--status-good)";
  }
  if (props.score >= 65) {
    return "var(--accent)";
  }
  if (props.score >= 45) {
    return "var(--status-warn)";
  }
  return "var(--status-bad)";
});

onMounted(() => {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      animatedScore.value = props.score;
    });
  });
});
</script>

<template>
  <div class="inline-flex flex-col items-center gap-1.5">
    <div class="relative" :style="{ width: `${size}px`, height: `${size}px` }">
      <svg :width="size" :height="size" :viewBox="`0 0 ${size} ${size}`" class="-rotate-90">
        <circle
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          fill="none"
          :stroke-width="STROKE_WIDTH"
          stroke="color-mix(in srgb, var(--line) 70%, transparent)"
        />
        <circle
          :cx="size / 2"
          :cy="size / 2"
          :r="radius"
          fill="none"
          :stroke-width="STROKE_WIDTH"
          stroke-linecap="round"
          :stroke="tone"
          :stroke-dasharray="circumference"
          :stroke-dashoffset="dashOffset"
          style="transition: stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)"
        />
      </svg>
      <div class="absolute inset-0 flex items-center justify-center">
        <span class="font-serif text-2xl font-semibold" :style="{ color: tone }">{{ Math.round(score) }}</span>
      </div>
    </div>
    <p v-if="label" class="text-[11px] font-semibold uppercase tracking-wide" :style="{ color: tone }">
      {{ label }}
    </p>
  </div>
</template>
