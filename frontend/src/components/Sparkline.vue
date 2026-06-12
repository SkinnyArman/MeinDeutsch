<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    points: number[];
    width?: number;
    height?: number;
    max?: number;
  }>(),
  {
    width: 120,
    height: 36,
    max: 100
  }
);

const PAD = 3;

const coords = computed(() => {
  const values = props.points;
  if (values.length === 0) {
    return [];
  }
  if (values.length === 1) {
    return [{ x: props.width / 2, y: yFor(values[0]) }];
  }
  const stepX = (props.width - PAD * 2) / (values.length - 1);
  return values.map((value, index) => ({ x: PAD + index * stepX, y: yFor(value) }));
});

const yFor = (value: number): number => {
  const clamped = Math.max(0, Math.min(props.max, value));
  return PAD + (1 - clamped / props.max) * (props.height - PAD * 2);
};

const linePath = computed(() => coords.value.map((c) => `${c.x},${c.y}`).join(" "));

const areaPath = computed(() => {
  if (coords.value.length < 2) {
    return "";
  }
  const first = coords.value[0];
  const last = coords.value[coords.value.length - 1];
  return `M ${first.x},${props.height - PAD} L ${coords.value.map((c) => `${c.x},${c.y}`).join(" L ")} L ${last.x},${props.height - PAD} Z`;
});
</script>

<template>
  <svg :width="width" :height="height" :viewBox="`0 0 ${width} ${height}`" class="block" aria-hidden="true">
    <path v-if="areaPath" :d="areaPath" fill="color-mix(in srgb, var(--accent) 14%, transparent)" />
    <polyline
      v-if="coords.length > 1"
      :points="linePath"
      fill="none"
      stroke="var(--accent)"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
    <circle
      v-if="coords.length"
      :cx="coords[coords.length - 1].x"
      :cy="coords[coords.length - 1].y"
      r="2.5"
      fill="var(--accent-strong)"
    />
  </svg>
</template>
