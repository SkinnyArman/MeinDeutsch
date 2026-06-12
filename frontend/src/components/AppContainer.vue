<script setup lang="ts">
const props = withDefaults(
  defineProps<{
    size?: "sm" | "md" | "lg";
  }>(),
  {
    size: "md"
  }
);

const sizeClass = {
  sm: "max-w-3xl",
  md: "max-w-5xl",
  lg: "max-w-6xl"
}[props.size];
</script>

<template>
  <div class="mx-auto w-full px-4 py-6 sm:px-6 sm:py-8" :class="sizeClass">
    <slot />
  </div>
</template>
