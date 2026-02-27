<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import { useQuery } from "@/libs/query";
import {
  BookOpen,
  Flame,
  Languages,
  LogOut,
  MessageCircle,
  PanelLeft,
  Settings
} from "lucide-vue-next";
import { THEME_MAP, THEME_STORAGE_KEY, type ThemeKey, applyThemeTokens } from "./theme/themes";
import type { DailyTalkStreakRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";
import { clearSession, getSessionUser } from "./utils/auth";

type ViewKey = "daily-talk" | "alltagssprache" | "vocabulary" | "settings";

const route = useRoute();
const router = useRouter();
const { t } = useLanguage();
const activeTheme = ref<ThemeKey>("default");
const nowMs = ref(Date.now());
const sessionUser = ref(getSessionUser());
const sidebarOpen = ref(true);

let tickTimer: ReturnType<typeof setInterval> | undefined;
let pollTimer: ReturnType<typeof setInterval> | undefined;

const navItems = computed(() => [
  {
    key: "daily-talk",
    title: t.dailyTalk.title(),
    subtitle: t.dailyTalk.history(),
    path: "/daily-talk",
    icon: MessageCircle
  },
  {
    key: "alltagssprache",
    title: t.alltag.title(),
    subtitle: t.alltag.subtitle(),
    path: "/alltagssprache",
    icon: Languages
  },
  {
    key: "vocabulary",
    title: t.vocab.title(),
    subtitle: t.vocab.subtitle(),
    path: "/vocabulary",
    icon: BookOpen
  },
  {
    key: "settings",
    title: t.settings.title(),
    subtitle: t.settings.title(),
    path: "/settings",
    icon: Settings
  }
]);

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

const streakQuery = useQuery({
  queryKey: ["streak", "daily-talk"],
  queryFn: async () => (await fetchJson<DailyTalkStreakRecord>(API_PATHS.streakDailyTalk)).data,
  refetchInterval: 60000
});

const streakRemainingMs = computed(() => {
  const endAt = streakQuery.data.value?.windowEndAt;
  if (!endAt) {
    return 0;
  }
  return Math.max(0, new Date(endAt).getTime() - nowMs.value);
});

const streakTooltip = computed(() => t.dailyTalk.streakRemaining({ time: formatRemaining(streakRemainingMs.value) }));

watch(
  activeTheme,
  (themeKey) => {
    applyThemeTokens(THEME_MAP[themeKey]);
    window.localStorage.setItem(THEME_STORAGE_KEY, themeKey);
  },
  { immediate: true }
);

onMounted(() => {
  tickTimer = setInterval(() => {
    nowMs.value = Date.now();
  }, 1000);
  pollTimer = setInterval(() => {
    void streakQuery.refetch();
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

  <main v-else class="h-[100dvh] overflow-hidden">
    <div class="flex h-full">
      <aside
        class="flex h-[100dvh] min-h-0 shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--sidebar-muted)_22%,transparent)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] transition-all duration-200"
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
            <button class="inline-flex h-8 w-8 items-center justify-center rounded-md transition hover:bg-[color-mix(in_srgb,var(--sidebar-text)_8%,transparent)]" type="button" @click="streakQuery.refetch()">
              <Flame class="h-5 w-5 text-amber-400 drop-shadow-sm" />
            </button>
            <div v-if="sidebarOpen" class="min-w-0">
              <p class="text-[11px] font-medium text-[var(--sidebar-text)]">
                {{ streakQuery.isFetching.value ? t.common.loading() : t.dailyTalk.streakLabel({ count: streakQuery.data.value?.currentStreak ?? 0 }) }}
              </p>
            </div>
            <span
              v-if="sidebarOpen"
              class="ml-auto rounded-md border border-[color-mix(in_srgb,var(--sidebar-muted)_30%,transparent)] bg-[color-mix(in_srgb,var(--sidebar-text)_8%,transparent)] px-1.5 py-0.5 text-[10px] font-semibold text-[var(--sidebar-muted)]"
            >
              {{ t.dailyTalk.levelPlaceholder() }}
            </span>
          </div>
        </div>

        <nav class="mt-4 min-h-0 flex-1 space-y-1 overflow-y-auto px-2">
          <RouterLink
            v-for="item in navItems.filter((n) => n.key !== 'settings')"
            :key="item.key"
            :to="item.path"
            class="flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition"
            :class="[sidebarItemClass(item.key), sidebarOpen ? '' : 'justify-center px-0']"
          >
            <component :is="item.icon" class="h-4 w-4 shrink-0" />
            <span v-if="sidebarOpen" class="truncate text-[13px] font-medium">{{ item.title }}</span>
          </RouterLink>
        </nav>

        <div class="px-2 pb-3">
          <RouterLink
            to="/settings"
            class="flex items-center gap-2 rounded-md border px-2.5 py-2 text-sm transition"
            :class="[sidebarItemClass('settings'), sidebarOpen ? '' : 'justify-center px-0']"
          >
            <Settings class="h-4 w-4 shrink-0" />
            <span v-if="sidebarOpen" class="truncate text-[13px] font-medium">{{ t.settings.title() }}</span>
          </RouterLink>
        </div>

        <div class="mt-auto shrink-0 border-t border-[color-mix(in_srgb,var(--sidebar-muted)_22%,transparent)] p-3">
          <div class="flex items-center gap-2" :class="sidebarOpen ? '' : 'justify-center'">
            <div class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--panel-soft)] text-[10px] font-semibold">
              {{ sessionUser?.displayName?.slice(0, 1)?.toUpperCase() ?? "U" }}
            </div>
            <div v-if="sidebarOpen" class="min-w-0 flex-1">
              <p class="truncate text-[12px] font-semibold">
                {{ sessionUser?.displayName?.trim() || t.common.unknownUser() }}
              </p>
              <p class="truncate text-[10px] text-[var(--sidebar-muted)]">{{ sessionUser?.email ?? "-" }}</p>
            </div>
            <button
              v-if="sidebarOpen"
              class="rounded-md border border-[color-mix(in_srgb,var(--sidebar-muted)_30%,transparent)] p-1.5 text-[var(--sidebar-muted)] transition hover:border-[var(--accent)] hover:text-[var(--sidebar-text)]"
              @click="logout"
            >
              <LogOut class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <section id="app-scroll" class="min-w-0 flex-1 overflow-y-auto bg-[var(--content-bg)]">
        <header class="sticky top-0 z-10 flex h-14 items-center gap-2 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--content-bg)_94%,transparent)] px-4 backdrop-blur-sm">
          <button
            class="inline-flex h-7 w-7 items-center justify-center rounded-md border border-[var(--line)] bg-[var(--panel)] transition hover:border-[var(--accent)]"
            type="button"
            @click="toggleSidebar"
          >
            <PanelLeft class="h-4 w-4" />
          </button>
          <span class="h-5 w-px bg-[var(--line)]" />
        </header>
        <div class="p-0">
          <RouterView />
        </div>
      </section>
    </div>
  </main>
</template>
