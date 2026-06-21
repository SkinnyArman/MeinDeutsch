<script setup lang="ts">
withDefaults(
  defineProps<{
    segments: Array<{ text: string; highlight: boolean }>;
    tone?: "error" | "success";
  }>(),
  {
    tone: "error"
  }
);

const toneClass: Record<"error" | "success", string> = {
  error: "rounded-sm bg-[color-mix(in_srgb,var(--status-bad)_25%,transparent)] px-1",
  success: "rounded-sm bg-[color-mix(in_srgb,var(--status-good)_28%,transparent)] px-1 font-medium"
};
</script>

<template>
  <p class="text-sm leading-relaxed">
    <template v-for="(segment, idx) in segments" :key="idx">
      <span :class="segment.highlight ? toneClass[tone] : ''">
        {{ segment.text }}
      </span>
    </template>
  </p>
</template>
