<script setup lang="ts">
import { computed } from "vue";
import { Loader2 } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    variant?: "primary" | "ghost" | "soft" | "icon";
    type?: "button" | "submit";
    loading?: boolean;
    disabled?: boolean;
    block?: boolean;
  }>(),
  {
    variant: "primary",
    type: "button",
    loading: false,
    disabled: false,
    block: false
  }
);

// Maps to the shared component classes defined in style.css.
const variantClass = computed(
  () =>
    ({
      primary: "btn-primary",
      ghost: "btn-ghost",
      soft: "btn-soft",
      icon: "btn-icon"
    })[props.variant]
);
</script>

<template>
  <button
    :type="type"
    :class="[variantClass, block ? 'w-full' : '']"
    :disabled="disabled || loading"
  >
    <Loader2 v-if="loading" class="h-4 w-4 animate-spin" />
    <slot v-else name="icon" />
    <slot />
  </button>
</template>
