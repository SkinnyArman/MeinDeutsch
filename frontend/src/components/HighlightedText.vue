<script setup lang="ts">
defineProps<{
  segments: Array<{ text: string; highlight: boolean }>;
}>();
</script>

<template>
  <p class="text-sm leading-relaxed">
    <template v-for="(segment, idx) in segments" :key="idx">
      <span
        :class="segment.highlight
          ? 'rounded-sm bg-[color-mix(in_srgb,var(--status-bad)_25%,transparent)] px-1'
          : ''"
      >
        {{ segment.text }}
      </span>
    </template>
  </p>
</template>
