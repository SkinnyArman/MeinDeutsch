<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from "vue";
import ApiTriggerView from "./components/ApiTriggerView.vue";
import DailyTalkView from "./components/DailyTalkView.vue";
import KnowledgeBaseView from "./components/KnowledgeBaseView.vue";
import TopicsQuestionsView from "./components/TopicsQuestionsView.vue";
import { THEME_MAP, THEMES, THEME_STORAGE_KEY, type ThemeKey, applyThemeTokens } from "./theme/themes";

type ViewKey = "daily-talk" | "api-trigger" | "topics-questions" | "knowledge-base";

const activeView = ref<ViewKey>("daily-talk");
const activeTheme = ref<ThemeKey>("default");
const baseUrl = ref("http://localhost:4000");
const nowMs = ref(Date.now());
const streakLoading = ref(false);
const streakValue = ref(0);
const streakWindowStartAt = ref<string | null>(null);
const streakWindowEndAt = ref<string | null>(null);

let tickTimer: ReturnType<typeof setInterval> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;

const navItems: Array<{ key: ViewKey; title: string; subtitle: string }> = [
  {
    key: "daily-talk",
    title: "Daily Talk",
    subtitle: "Generate, answer, and get corrections"
  },
  {
    key: "topics-questions",
    title: "Topics",
    subtitle: "Add or delete question topics"
  },
  {
    key: "knowledge-base",
    title: "Knowledge",
    subtitle: "Review stored learner memory"
  },
  {
    key: "api-trigger",
    title: "API Trigger",
    subtitle: "Backend endpoint playground"
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

const formatRemaining = (ms: number): string => {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}h ${minutes}m ${seconds}s`;
};

const streakProgress = computed(() => {
  if (!streakWindowStartAt.value || !streakWindowEndAt.value) {
    return 0;
  }

  const start = new Date(streakWindowStartAt.value).getTime();
  const end = new Date(streakWindowEndAt.value).getTime();
  const total = Math.max(1, end - start);
  const remaining = Math.max(0, end - nowMs.value);
  return Math.min(1, remaining / total);
});

const streakRemainingMs = computed(() => {
  if (!streakWindowEndAt.value) {
    return 0;
  }
  return Math.max(0, new Date(streakWindowEndAt.value).getTime() - nowMs.value);
});

const streakTooltip = computed(() => `Time left for today's streak window: ${formatRemaining(streakRemainingMs.value)}`);

const streakRingStyle = computed(() => ({
  "--progress": `${(streakProgress.value * 100).toFixed(2)}%`
}));

const loadStreak = async (): Promise<void> => {
  streakLoading.value = true;
  try {
    const res = await fetch(`${baseUrl.value}/api/streaks/daily-talk`);
    const payload = await res.json();
    if (!res.ok || !payload.success) {
      throw new Error(payload.message || "Failed to load streak");
    }

    streakValue.value = payload.data.currentStreak ?? 0;
    streakWindowStartAt.value = payload.data.windowStartAt ?? null;
    streakWindowEndAt.value = payload.data.windowEndAt ?? null;
  } catch {
    streakValue.value = 0;
    streakWindowStartAt.value = null;
    streakWindowEndAt.value = null;
  } finally {
    streakLoading.value = false;
  }
};

watch(
  activeTheme,
  (themeKey) => {
    applyThemeTokens(THEME_MAP[themeKey]);
    window.localStorage.setItem(THEME_STORAGE_KEY, themeKey);
  },
  { immediate: true }
);

onMounted(() => {
  void loadStreak();
  tickTimer = setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
  pollTimer = setInterval(() => {
    void loadStreak();
  }, 60000);
});

onUnmounted(() => {
  if (tickTimer) {
    clearInterval(tickTimer);
  }
  if (pollTimer) {
    clearInterval(pollTimer);
  }
});
</script>

<template>
  <main class="min-h-screen p-4 md:p-6">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 md:flex-row">
      <aside class="surface w-full p-3 md:w-72 md:self-start">
        <div class="mb-3 flex items-center justify-between gap-3 px-2">
          <h1 class="text-lg font-semibold">MeinDeutsch</h1>
          <button
            class="streak-ring"
            :style="streakRingStyle"
            :title="streakTooltip"
            type="button"
            @click="loadStreak"
          >
            <span class="streak-core">
              <svg viewBox="0 0 24 24" fill="none" class="h-4 w-4">
                <path
                  d="M12.8 2.4c.3 2.2-.4 4.2-2 5.7-1 1-1.6 2.2-1.6 3.6 0 2 1.6 3.7 3.6 3.7 2.5 0 4.2-2.1 4.2-4.6 0-2.9-1.8-5.8-4.2-8.4Z"
                  stroke="currentColor"
                  stroke-width="1.7"
                  stroke-linecap="round"
                  stroke-linejoin="round"
                />
                <path
                  d="M12 21c3.3 0 6-2.7 6-6 0-2.6-1.5-4.8-3.7-6 .2.8.3 1.5.3 2.3 0 3.4-2.3 6.2-5.4 6.2-2.2 0-4-1.5-4.5-3.6A5.99 5.99 0 0 0 12 21Z"
                  fill="currentColor"
                />
              </svg>
              <span class="streak-count">{{ streakLoading ? "…" : streakValue }}</span>
            </span>
          </button>
        </div>

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
              activeView === "daily-talk"
                ? "Daily Talk"
                : activeView === "api-trigger"
                  ? "API Trigger"
                  : activeView === "topics-questions"
                    ? "Topics"
                    : "Knowledge Base"
            }}
          </h2>
          <p class="mt-1 text-sm muted">
            {{
              activeView === "daily-talk"
                ? "Question generation + answer correction in one focused flow."
                : activeView === "api-trigger"
                  ? "Run any backend endpoint from one page."
                  : activeView === "topics-questions"
                    ? "Create and maintain the topic list used for question generation."
                    : "Inspect knowledge entries generated from Daily Talk submissions."
            }}
          </p>
        </header>

        <DailyTalkView v-if="activeView === 'daily-talk'" />
        <ApiTriggerView v-else-if="activeView === 'api-trigger'" />
        <TopicsQuestionsView v-else-if="activeView === 'topics-questions'" />
        <KnowledgeBaseView v-else />
      </section>
    </div>
  </main>
</template>
