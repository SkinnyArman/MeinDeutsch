<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { useRoute } from "vue-router";
import { THEME_MAP, THEME_STORAGE_KEY, type ThemeKey, applyThemeTokens } from "./theme/themes";

type ViewKey = "daily-talk" | "vocabulary" | "settings";

const route = useRoute();
const activeTheme = ref<ThemeKey>("default");
const baseUrl = ref("http://localhost:4000");
const nowMs = ref(Date.now());
const streakLoading = ref(false);
const streakValue = ref(0);
const streakWindowStartAt = ref<string | null>(null);
const streakWindowEndAt = ref<string | null>(null);

let tickTimer: ReturnType<typeof setInterval> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;

const navItems: Array<{ key: ViewKey; title: string; subtitle: string; path: string }> = [
  {
    key: "daily-talk",
    title: "Daily Talk",
    subtitle: "Generate, answer, and review",
    path: "/daily-talk"
  },
  {
    key: "vocabulary",
    title: "Vocabulary",
    subtitle: "Saved words by category",
    path: "/vocabulary"
  },
  {
    key: "settings",
    title: "Settings",
    subtitle: "Themes, topics, tools",
    path: "/settings"
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

const BASE_URL_STORAGE_KEY = "meindeutsch_base_url";

const getInitialBaseUrl = (): string => {
  if (typeof window === "undefined") {
    return "http://localhost:4000";
  }
  return window.localStorage.getItem(BASE_URL_STORAGE_KEY) ?? "http://localhost:4000";
};

baseUrl.value = getInitialBaseUrl();

provide("baseUrl", baseUrl);
provide("activeTheme", activeTheme);
provide("setActiveTheme", (value: ThemeKey) => {
  activeTheme.value = value;
});

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
  background: `conic-gradient(var(--accent) 0 ${(streakProgress.value * 100).toFixed(2)}%, color-mix(in srgb, var(--line) 75%, transparent) ${(streakProgress.value * 100).toFixed(2)}% 100%)`
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

watch(
  baseUrl,
  (value) => {
    window.localStorage.setItem(BASE_URL_STORAGE_KEY, value);
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

const activeNavKey = computed(() => {
  if (route.path.startsWith("/settings")) {
    return "settings";
  }
  if (route.path.startsWith("/vocabulary")) {
    return "vocabulary";
  }
  return "daily-talk";
});
</script>

<template>
  <main class="min-h-screen p-4 md:p-6">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 md:flex-row">
      <aside class="w-full rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)] md:w-72 md:self-start">
        <div class="mb-3 flex items-center justify-between gap-3 px-2">
          <h1 class="text-lg font-semibold">MeinDeutsch</h1>
          <button
            class="flex h-12 w-12 items-center justify-center rounded-full p-1 transition"
            :style="streakRingStyle"
            :title="streakTooltip"
            type="button"
            @click="loadStreak"
          >
            <span class="flex h-full w-full items-center justify-center gap-1 rounded-full bg-[var(--panel)] text-[var(--accent)] text-xs font-semibold">
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
              <span class="text-[10px] leading-none">{{ streakLoading ? "…" : streakValue }}</span>
            </span>
          </button>
        </div>

        <nav class="space-y-2">
          <RouterLink
            v-for="item in navItems"
            :key="item.key"
            :to="item.path"
            class="block w-full rounded-lg border border-transparent bg-[var(--panel-soft)] px-3 py-2 text-left text-[var(--muted)] transition"
            :class="activeNavKey === item.key ? 'border-[var(--accent)] bg-[color-mix(in srgb, var(--accent) 14%, var(--panel-soft))] text-[var(--text)]' : ''"
          >
            <p class="text-sm font-medium">{{ item.title }}</p>
            <p class="text-xs opacity-80">{{ item.subtitle }}</p>
          </RouterLink>
        </nav>
      </aside>

      <section class="min-w-0 flex-1 rounded-xl border border-[var(--line)] bg-[color-mix(in srgb, var(--panel-soft) 82%, transparent)] p-4 shadow-[var(--surface-shadow)] md:p-6">
        <RouterView />
      </section>
    </div>
  </main>
</template>
