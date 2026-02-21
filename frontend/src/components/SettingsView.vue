<script setup lang="ts">
import { computed } from "vue";
import ApiTriggerView from "./ApiTriggerView.vue";
import KnowledgeBaseView from "./KnowledgeBaseView.vue";
import TopicsQuestionsView from "./TopicsQuestionsView.vue";
import type { ThemeDefinition, ThemeKey } from "../theme/themes";

const props = defineProps<{
  baseUrl: string;
  themes: ThemeDefinition[];
  activeTheme: ThemeKey;
}>();

const emit = defineEmits<{
  (e: "update:baseUrl", value: string): void;
  (e: "update:activeTheme", value: ThemeKey): void;
}>();

const baseUrlModel = computed({
  get: () => props.baseUrl,
  set: (value: string) => emit("update:baseUrl", value)
});
</script>

<template>
  <section class="space-y-4">
    <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <h3 class="text-lg font-semibold">App Settings</h3>
      <p class="mt-1 text-sm text-[var(--muted)]">Configure shared settings used across the app.</p>

      <div class="mt-4 grid gap-4 md:grid-cols-2">
        <div class="space-y-2">
          <label class="block text-sm text-[var(--muted)]">API Base URL</label>
          <input
            v-model="baseUrlModel"
            class="w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            type="text"
            placeholder="http://localhost:4000"
          />
        </div>
        <div>
          <label class="block text-sm text-[var(--muted)]">Theme</label>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="theme in themes"
              :key="theme.key"
              :title="theme.label"
              class="relative flex h-10 w-10 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-soft)] transition"
              :class="activeTheme === theme.key ? 'border-[var(--accent)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_30%,transparent)]' : ''"
              @click="emit('update:activeTheme', theme.key)"
            >
              <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: theme.swatch[0] }" />
              <span class="-ml-1 h-3 w-3 rounded-full" :style="{ backgroundColor: theme.swatch[1] }" />
              <span class="-ml-1 h-3 w-3 rounded-full" :style="{ backgroundColor: theme.swatch[2] }" />
            </button>
          </div>
        </div>
      </div>
    </article>

    <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-lg font-semibold">Topics</h3>
        <span class="rounded px-2 py-1 text-xs text-[var(--accent)] bg-[color-mix(in srgb, var(--accent) 16%, var(--panel-soft))] border border-[color-mix(in srgb, var(--accent) 35%, var(--line))]">
          Settings
        </span>
      </div>
      <TopicsQuestionsView :base-url="baseUrl" />
    </article>

    <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-lg font-semibold">Knowledge Base</h3>
        <span class="rounded px-2 py-1 text-xs text-[var(--accent)] bg-[color-mix(in srgb, var(--accent) 16%, var(--panel-soft))] border border-[color-mix(in srgb, var(--accent) 35%, var(--line))]">
          Settings
        </span>
      </div>
      <KnowledgeBaseView :base-url="baseUrl" />
    </article>

    <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h3 class="text-lg font-semibold">API Trigger</h3>
        <span class="rounded px-2 py-1 text-xs text-[var(--accent)] bg-[color-mix(in srgb, var(--accent) 16%, var(--panel-soft))] border border-[color-mix(in srgb, var(--accent) 35%, var(--line))]">
          Settings
        </span>
      </div>
      <ApiTriggerView :base-url="baseUrl" />
    </article>
  </section>
</template>
