<script setup lang="ts">
import { useRegisterSW } from "virtual:pwa-register/vue";
import { RefreshCw, X } from "lucide-vue-next";
import { useLanguage } from "@/libs/i18n";
import BaseButton from "./BaseButton.vue";

const { t } = useLanguage();

// registerType is "prompt": a new service worker waits until the user opts in,
// so we never reload out from under an exercise in progress.
const { needRefresh, updateServiceWorker } = useRegisterSW();

const apply = (): void => {
  void updateServiceWorker(true);
};

const dismiss = (): void => {
  needRefresh.value = false;
};
</script>

<template>
  <Transition
    enter-active-class="transition duration-200 ease-out"
    enter-from-class="translate-y-3 opacity-0"
    enter-to-class="translate-y-0 opacity-100"
    leave-active-class="transition duration-150 ease-in"
    leave-from-class="opacity-100"
    leave-to-class="opacity-0"
  >
    <div
      v-if="needRefresh"
      class="card fixed inset-x-4 bottom-20 z-[60] mx-auto flex max-w-md items-center gap-3 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.18)] lg:bottom-6"
      role="alert"
    >
      <span class="eyebrow-icon h-9 w-9 shrink-0 rounded-xl">
        <RefreshCw class="h-4 w-4" />
      </span>
      <p class="min-w-0 flex-1 text-sm font-medium">{{ t.pwa.updateAvailable() }}</p>
      <BaseButton class="px-3 py-2 text-xs" @click="apply">{{ t.pwa.reload() }}</BaseButton>
      <button class="btn-icon h-8 w-8 shrink-0 rounded-lg" :title="t.common.cancel()" @click="dismiss">
        <X class="h-4 w-4" />
      </button>
    </div>
  </Transition>
</template>
