<script setup lang="ts">
import { onMounted, onUnmounted, ref } from "vue";
import { Download, X } from "lucide-vue-next";
import BaseButton from "./BaseButton.vue";

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
};

const promptEvent = ref<BeforeInstallPromptEvent | null>(null);
const dismissed = ref(false);

const isStandalone = (): boolean =>
  window.matchMedia("(display-mode: standalone)").matches || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;

const onBeforeInstallPrompt = (event: Event): void => {
  event.preventDefault();
  if (!isStandalone()) {
    promptEvent.value = event as BeforeInstallPromptEvent;
  }
};

const onAppInstalled = (): void => {
  promptEvent.value = null;
  dismissed.value = true;
};

const install = async (): Promise<void> => {
  const event = promptEvent.value;
  if (!event) {
    return;
  }

  promptEvent.value = null;
  await event.prompt();
  await event.userChoice;
};

const dismiss = (): void => {
  dismissed.value = true;
};

onMounted(() => {
  window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.addEventListener("appinstalled", onAppInstalled);
});

onUnmounted(() => {
  window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
  window.removeEventListener("appinstalled", onAppInstalled);
});
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
      v-if="promptEvent && !dismissed"
      class="card fixed inset-x-4 bottom-20 z-[60] mx-auto flex max-w-md items-center gap-3 p-3.5 shadow-[0_12px_32px_rgba(0,0,0,0.18)] lg:bottom-6"
      role="dialog"
      aria-label="Install MeinDeutsch"
    >
      <span class="eyebrow-icon h-9 w-9 shrink-0 rounded-xl">
        <Download class="h-4 w-4" />
      </span>
      <p class="min-w-0 flex-1 text-sm font-medium">Install MeinDeutsch for quick access.</p>
      <BaseButton class="px-3 py-2 text-xs" @click="install">Install</BaseButton>
      <button class="btn-icon h-8 w-8 shrink-0 rounded-lg" title="Dismiss" @click="dismiss">
        <X class="h-4 w-4" />
      </button>
    </div>
  </Transition>
</template>
