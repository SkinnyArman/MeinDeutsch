<script setup lang="ts">
import { ref, watch } from "vue";
import ApiTriggerView from "./components/ApiTriggerView.vue";
import KnowledgeBaseView from "./components/KnowledgeBaseView.vue";
import TopicsQuestionsView from "./components/TopicsQuestionsView.vue";
import { THEME_MAP, THEMES, THEME_STORAGE_KEY, type ThemeKey, applyThemeTokens } from "./theme/themes";

type ViewKey = "api-trigger" | "topics-questions" | "knowledge-base";

const activeView = ref<ViewKey>("api-trigger");
const activeTheme = ref<ThemeKey>("default");

const navItems: Array<{ key: ViewKey; title: string; subtitle: string }> = [
  {
    key: "api-trigger",
    title: "API Trigger",
    subtitle: "Current full endpoint playground"
  },
  {
    key: "topics-questions",
    title: "Topics & Questions",
    subtitle: "Create/delete topics and manage list"
  },
  {
    key: "knowledge-base",
    title: "Knowledge Base",
    subtitle: "Browse stored learner memory entries"
  }
];

const getInitialTheme = (): ThemeKey => {
  if (typeof window === "undefined") {
    return "default";
  }

  const stored = window.localStorage.getItem(THEME_STORAGE_KEY) as ThemeKey | null;
  if (stored && THEME_MAP[stored]) {
    return stored;
  }

  return "default";
};

activeTheme.value = getInitialTheme();

watch(
  activeTheme,
  (themeKey) => {
    applyThemeTokens(THEME_MAP[themeKey]);
    window.localStorage.setItem(THEME_STORAGE_KEY, themeKey);
  },
  { immediate: true }
);
</script>

<template>
  <main class="min-h-screen p-4 md:p-6">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 md:flex-row">
      <aside class="surface w-full p-3 md:w-72 md:self-start">
        <h1 class="mb-3 px-2 text-lg font-semibold">MeinDeutsch</h1>

        <p class="mb-2 px-2 text-xs font-medium uppercase tracking-wide muted">Theme</p>
        <div class="mb-4 flex flex-wrap gap-2 px-2">
          <button
            v-for="theme in THEMES"
            :key="theme.key"
            :title="theme.label"
            class="theme-chip"
            :class="activeTheme === theme.key ? 'theme-chip-active' : ''"
            @click="activeTheme = theme.key"
          >
            <span class="theme-dot" :style="{ backgroundColor: theme.swatch[0] }" />
            <span class="theme-dot -ml-1" :style="{ backgroundColor: theme.swatch[1] }" />
            <span class="theme-dot -ml-1" :style="{ backgroundColor: theme.swatch[2] }" />
          </button>
        </div>

        <nav class="space-y-2">
          <button
            v-for="item in navItems"
            :key="item.key"
            class="nav-btn"
            :class="activeView === item.key ? 'nav-btn-active' : ''"
            @click="activeView = item.key"
          >
            <p class="text-sm font-medium">{{ item.title }}</p>
            <p class="text-xs opacity-80">{{ item.subtitle }}</p>
          </button>
        </nav>
      </aside>

      <section class="surface-soft min-w-0 flex-1 p-4 md:p-6">
        <header class="mb-6">
          <h2 class="text-2xl font-semibold tracking-tight">
            {{
              activeView === "api-trigger"
                ? "API Trigger"
                : activeView === "topics-questions"
                  ? "Topics & Questions"
                  : "Knowledge Base"
            }}
          </h2>
          <p class="mt-1 text-sm muted">
            {{
              activeView === "api-trigger"
                ? "Run any backend endpoint from one page."
                : activeView === "topics-questions"
                  ? "Use the focused flow: create and maintain topics."
                  : "Inspect knowledge entries generated from Daily Talk submissions."
            }}
          </p>
        </header>

        <ApiTriggerView v-if="activeView === 'api-trigger'" />
        <TopicsQuestionsView v-else-if="activeView === 'topics-questions'" />
        <KnowledgeBaseView v-else />
      </section>
    </div>
  </main>
</template>
