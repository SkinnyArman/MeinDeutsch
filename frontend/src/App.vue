<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { THEME_MAP, THEME_STORAGE_KEY, type ThemeKey, applyThemeTokens } from "./theme/themes";
import { authFetch, clearSession, getSessionUser } from "./utils/auth";

type ViewKey = "daily-talk" | "alltagssprache" | "vocabulary" | "settings";

const route = useRoute();
const router = useRouter();
const activeTheme = ref<ThemeKey>("default");
const baseUrl = ref("http://localhost:4000");
const nowMs = ref(Date.now());
const streakLoading = ref(false);
const streakValue = ref(0);
const streakWindowStartAt = ref<string | null>(null);
const streakWindowEndAt = ref<string | null>(null);
const sessionUser = ref(getSessionUser());
const sidebarOpen = ref(true);

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
    key: "alltagssprache",
    title: "Alltagssprache",
    subtitle: "Native everyday expressions",
    path: "/alltagssprache"
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

const navIcons: Record<ViewKey, string> = {
  "daily-talk": "chat",
  alltagssprache: "translate",
  vocabulary: "book",
  settings: "gear"
};

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

const streakRemainingMs = computed(() => {
  if (!streakWindowEndAt.value) {
    return 0;
  }
  return Math.max(0, new Date(streakWindowEndAt.value).getTime() - nowMs.value);
});

const streakTooltip = computed(() => `Time left for today's streak window: ${formatRemaining(streakRemainingMs.value)}`);

const loadStreak = async (): Promise<void> => {
  streakLoading.value = true;
  try {
    const res = await authFetch(`${baseUrl.value}/api/streaks/daily-talk`);
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
  if (route.path === "/login") {
    return "";
  }
  if (route.path.startsWith("/settings")) {
    return "settings";
  }
  if (route.path.startsWith("/vocabulary")) {
    return "vocabulary";
  }
  if (route.path.startsWith("/alltagssprache")) {
    return "alltagssprache";
  }
  return "daily-talk";
});

const showMainLayout = computed(() => route.path !== "/login");
const sidebarItemClass = (key: ViewKey): string => {
  const isActive = activeNavKey.value === key;
  if (isActive) {
    return "border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_18%,transparent)] text-[var(--sidebar-text)]";
  }
  return "border-transparent bg-transparent text-[var(--sidebar-muted)] hover:border-[color-mix(in_srgb,var(--sidebar-muted)_30%,transparent)] hover:bg-[color-mix(in_srgb,var(--sidebar-text)_6%,transparent)]";
};

const toggleSidebar = (): void => {
  sidebarOpen.value = !sidebarOpen.value;
};

const logout = async (): Promise<void> => {
  clearSession();
  sessionUser.value = null;
  await router.replace("/login");
};
</script>

<template>
  <RouterView v-if="!showMainLayout" />

  <main v-else class="h-screen overflow-hidden">
    <div class="flex h-full">
      <aside
        class="flex h-full shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--sidebar-muted)_22%,transparent)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] transition-all duration-200"
        :class="sidebarOpen ? 'w-64' : 'w-16'"
      >
        <div class="px-3 pt-4">
          <div class="flex items-center gap-2" :class="sidebarOpen ? '' : 'justify-center'">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--accent)] text-[10px] font-semibold text-[var(--accent-contrast)]">
              M
            </div>
            <h1 v-if="sidebarOpen" class="text-sm font-semibold tracking-tight">MeinDeutsch</h1>
          </div>
        </div>

        <div class="px-3 pt-3">
          <div
            class="flex items-center gap-2 rounded-lg border border-[color-mix(in_srgb,var(--sidebar-muted)_25%,transparent)] bg-[color-mix(in_srgb,var(--sidebar-text)_7%,transparent)] px-2.5 py-2"
            :class="sidebarOpen ? '' : 'justify-center px-0'"
            :title="streakTooltip"
          >
            <button class="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-[color-mix(in_srgb,var(--sidebar-text)_8%,transparent)]" type="button" @click="loadStreak">
              <svg viewBox="0 0 24 24" fill="none" class="h-5 w-5">
                <defs>
                  <linearGradient id="flameGradient" x1="12" y1="2" x2="12" y2="22" gradientUnits="userSpaceOnUse">
                    <stop offset="0" stop-color="#fde68a" />
                    <stop offset="0.55" stop-color="#f59e0b" />
                    <stop offset="1" stop-color="#ef4444" />
                  </linearGradient>
                </defs>
                <path d="M13.8 2.3c.8 3.6-.4 5.6-2.2 7.3-1.4 1.3-2.2 2.9-2.2 4.6 0 2.8 2.3 5 5 5 3.7 0 6.2-2.8 6.2-6.6 0-3.9-2.5-7.4-6.8-10.3Z" fill="url(#flameGradient)" />
                <path d="M12.8 10.9c.3 1.6-.2 2.4-1.1 3.3-.6.5-.9 1.2-.9 2 0 1.3 1 2.3 2.3 2.3 1.7 0 2.9-1.4 2.9-3.2 0-1.9-1.1-3.5-3.2-4.4Z" fill="#fff7ed" fill-opacity="0.85" />
              </svg>
            </button>
            <div v-if="sidebarOpen" class="min-w-0">
              <p class="text-[11px] font-medium text-[var(--sidebar-text)]">{{ streakLoading ? "Loading..." : `${streakValue}-day streak` }}</p>
            </div>
            <span
              v-if="sidebarOpen"
              class="ml-auto rounded-md border border-[color-mix(in_srgb,var(--sidebar-muted)_30%,transparent)] bg-[color-mix(in_srgb,var(--sidebar-text)_8%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--sidebar-muted)]"
            >
              B1
            </span>
          </div>
        </div>

        <nav class="mt-4 flex-1 space-y-1 px-2">
          <RouterLink
            v-for="item in navItems.filter((n) => n.key !== 'settings')"
            :key="item.key"
            :to="item.path"
            class="flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition"
            :class="[sidebarItemClass(item.key), sidebarOpen ? '' : 'justify-center px-0']"
          >
            <svg v-if="navIcons[item.key] === 'chat'" viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0">
              <path d="M4 5.5h12v7H7l-3 2v-9Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5" />
            </svg>
            <svg v-else-if="navIcons[item.key] === 'translate'" viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0">
              <path d="M3 5h6M6 5v10M2.5 11h7M13 7h5m-2.5 0v8m-2.5-3h5" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
            </svg>
            <svg v-else-if="navIcons[item.key] === 'book'" viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0">
              <path d="M3 4.5h6a2 2 0 0 1 2 2V16H5a2 2 0 0 1-2-2V4.5Zm14 0h-6a2 2 0 0 0-2 2V16h6a2 2 0 0 0 2-2V4.5Z" stroke="currentColor" stroke-width="1.5" />
            </svg>
            <svg v-else viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0">
              <path d="M10 4.5v2m0 7v2m5.5-5.5h-2m-7 0h-2M13.9 6.1l-1.4 1.4M7.5 12.5 6.1 13.9M13.9 13.9l-1.4-1.4M7.5 7.5 6.1 6.1" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
            </svg>
            <span v-if="sidebarOpen" class="truncate text-[13px] font-medium">{{ item.title }}</span>
          </RouterLink>
        </nav>

        <div class="px-2 pb-3">
          <RouterLink
            to="/settings"
            class="flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition"
            :class="[sidebarItemClass('settings'), sidebarOpen ? '' : 'justify-center px-0']"
          >
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4 shrink-0">
              <path d="M10 4.5v2m0 7v2m5.5-5.5h-2m-7 0h-2M13.9 6.1l-1.4 1.4M7.5 12.5 6.1 13.9M13.9 13.9l-1.4-1.4M7.5 7.5 6.1 6.1" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
            </svg>
            <span v-if="sidebarOpen" class="truncate text-[13px] font-medium">Settings</span>
          </RouterLink>
        </div>

        <div class="mt-auto border-t border-[color-mix(in_srgb,var(--sidebar-muted)_22%,transparent)] p-3">
          <div class="flex items-center gap-2" :class="sidebarOpen ? '' : 'justify-center'">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--panel-soft)] text-[10px] font-semibold">
              {{ sessionUser?.displayName?.slice(0, 1)?.toUpperCase() ?? "U" }}
            </div>
            <div v-if="sidebarOpen" class="min-w-0 flex-1">
              <p class="truncate text-[12px] font-semibold">
                {{ sessionUser?.displayName?.trim() || "Signed in user" }}
              </p>
              <p class="truncate text-[10px] text-[var(--sidebar-muted)]">{{ sessionUser?.email ?? "-" }}</p>
            </div>
            <button
              v-if="sidebarOpen"
              class="rounded-md border border-[color-mix(in_srgb,var(--sidebar-muted)_30%,transparent)] p-1.5 text-[var(--sidebar-muted)] transition hover:border-[var(--accent)] hover:text-[var(--sidebar-text)]"
              @click="logout"
            >
              <svg viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5">
                <path d="M7 6V4.5A1.5 1.5 0 0 1 8.5 3h6A1.5 1.5 0 0 1 16 4.5v11a1.5 1.5 0 0 1-1.5 1.5h-6A1.5 1.5 0 0 1 7 15.5V14M11.5 10H4m0 0 2.5-2.5M4 10l2.5 2.5" stroke="currentColor" stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" />
              </svg>
            </button>
          </div>
        </div>
      </aside>

      <section class="min-w-0 flex-1 overflow-y-auto bg-[var(--content-bg)]">
        <header class="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--content-bg)_94%,transparent)] px-4 backdrop-blur-sm">
          <button
            class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] transition hover:border-[var(--accent)]"
            type="button"
            @click="toggleSidebar"
          >
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4">
              <path d="M4 5h12M4 10h12M4 15h12" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
            </svg>
          </button>
          <span class="h-5 w-px bg-[var(--line)]" />
        </header>
        <div class="p-4 md:p-6">
          <RouterView />
        </div>
      </section>
    </div>
  </main>
</template>
