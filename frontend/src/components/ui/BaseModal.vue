<script setup lang="ts">
import { onBeforeUnmount, onMounted, watch } from "vue";
import { X } from "lucide-vue-next";

const props = withDefaults(
  defineProps<{
    open: boolean;
    title?: string;
    subtitle?: string;
    // When false, the modal cannot be dismissed (no backdrop click, no Esc, no
    // close button). Used for blocking flows like the placement exam.
    dismissable?: boolean;
    size?: "sm" | "md" | "lg";
  }>(),
  {
    dismissable: true,
    size: "md"
  }
);

const emit = defineEmits<{ close: [] }>();

const sizeClass = {
  sm: "max-w-md",
  md: "max-w-xl",
  lg: "max-w-3xl"
}[props.size];

const requestClose = (): void => {
  if (props.dismissable) {
    emit("close");
  }
};

const onKeydown = (event: KeyboardEvent): void => {
  if (event.key === "Escape" && props.open && props.dismissable) {
    emit("close");
  }
};

// Lock body scroll while any modal is open.
watch(
  () => props.open,
  (open) => {
    if (typeof document !== "undefined") {
      document.body.style.overflow = open ? "hidden" : "";
    }
  },
  { immediate: true }
);

onMounted(() => window.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => {
  window.removeEventListener("keydown", onKeydown);
  if (typeof document !== "undefined") {
    document.body.style.overflow = "";
  }
});
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="opacity-0"
    enter-to-class="opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="open"
      class="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto bg-[color-mix(in_srgb,var(--bg)_55%,#000)]/70 p-4 backdrop-blur-sm"
      @click.self="requestClose"
    >
      <div class="card animate-pop-in my-auto w-full p-6 sm:p-8" :class="sizeClass" role="dialog" aria-modal="true">
        <div v-if="title || dismissable" class="mb-4 flex items-start justify-between gap-4">
          <div v-if="title" class="min-w-0">
            <h2 class="font-serif text-xl font-semibold leading-tight">{{ title }}</h2>
            <p v-if="subtitle" class="mt-1 text-sm text-[var(--muted)]">{{ subtitle }}</p>
          </div>
          <button
            v-if="dismissable"
            class="btn-icon ml-auto h-8 w-8 shrink-0 rounded-lg"
            type="button"
            @click="emit('close')"
          >
            <X class="h-4 w-4" />
          </button>
        </div>
        <slot />
      </div>
    </div>
  </Transition>
</template>
