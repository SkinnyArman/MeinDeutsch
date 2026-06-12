<script setup lang="ts">
import { computed, onMounted, onUnmounted, provide, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import { useQuery } from "@/libs/query";
import {
  BookOpen,
  CheckCircle2,
  Flame,
  Languages,
  LogOut,
  MessageCircle,
  PanelLeft,
  Puzzle,
  Settings
} from "lucide-vue-next";
import { THEME_MAP, THEME_STORAGE_KEY, type ThemeKey, applyThemeTokens } from "./theme/themes";
import type { DailyTalkStreakRecord } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";
import { clearSession, getSessionUser } from "./utils/auth";

type ViewKey = "daily-talk" | "alltagssprache" | "kollokationen" | "vocabulary" | "settings";

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
    key: "daily-talk" as ViewKey,
    title: t.dailyTalk.title(),
    shortTitle: t.tabs.dailyTalk(),
    path: "/daily-talk",
    icon: MessageCircle
  },
  {
    key: "alltagssprache" as ViewKey,
    title: t.alltag.title(),
    shortTitle: t.tabs.alltag(),
    path: "/alltagssprache",
    icon: Languages
  },
  {
    key: "kollokationen" as ViewKey,
    title: t.kollok.title(),
    shortTitle: t.kollok.tab(),
    path: "/kollokationen",
    icon: Puzzle
  },
  {
    key: "vocabulary" as ViewKey,
    title: t.vocab.title(),
    shortTitle: t.tabs.vocab(),
    path: "/vocabulary",
    icon: BookOpen
  },
  {
    key: "settings" as ViewKey,
    title: t.settings.title(),
    shortTitle: t.settings.title(),
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
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes}m ${seconds}s`;
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

const streakCount = computed(() => streakQuery.data.value?.currentStreak ?? 0);
const streakSafeToday = computed(() => Boolean(streakQuery.data.value?.hasCompletedToday));
const streakStatusText = computed(() =>
  streakSafeToday.value
    ? t.shell.streakSafe()
    : t.shell.streakAtRisk({ time: formatRemaining(streakRemainingMs.value) })
);

const firstName = computed(() => {
  const name = sessionUser.value?.displayName?.trim();
  if (!name) {
    return "";
  }
  return name.split(/\s+/)[0];
});

const greeting = computed(() => {
  // touch nowMs so the greeting flips when crossing the boundary
  const hour = new Date(nowMs.value).getHours();
  if (hour < 12) {
    return t.shell.greetingMorning();
  }
  if (hour < 18) {
    return t.shell.greetingAfternoon();
  }
  return t.shell.greetingEvening();
});

const todayLabel = computed(() =>
  new Intl.DateTimeFormat("de-DE", { weekday: "long", day: "numeric", month: "long" }).format(new Date(nowMs.value))
);

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

const activeNavKey = computed<ViewKey | "">(() => {
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
  if (route.path.startsWith("/kollokationen")) {
    return "kollokationen";
  }
  return "daily-talk";
});

const showMainLayout = computed(() => route.path !== "/login");

const sidebarItemClass = (key: ViewKey): string => {
  const isActive = activeNavKey.value === key;
  if (isActive) {
    return "border-[color-mix(in_srgb,var(--accent)_55%,transparent)] bg-[color-mix(in_srgb,var(--accent)_16%,transparent)] text-[var(--sidebar-text)] shadow-[inset_0_0_0_1px_color-mix(in_srgb,var(--accent)_25%,transparent)]";
  }
  return "border-transparent bg-transparent text-[var(--sidebar-muted)] hover:bg-[color-mix(in_srgb,var(--sidebar-text)_7%,transparent)] hover:text-[var(--sidebar-text)]";
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
      <!-- Desktop sidebar -->
      <aside
        class="hidden h-[100dvh] min-h-0 shrink-0 flex-col border-r border-[color-mix(in_srgb,var(--sidebar-muted)_20%,transparent)] bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] transition-all duration-200 lg:flex"
        :class="sidebarOpen ? 'w-64' : 'w-[72px]'"
      >
        <div class="px-3 pt-5">
          <div class="flex items-center gap-2.5" :class="sidebarOpen ? 'px-1' : 'justify-center'">
            <div
              class="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold text-white shadow-[0_4px_14px_color-mix(in_srgb,var(--accent)_45%,transparent)]"
              style="background-image: linear-gradient(135deg, var(--accent), var(--accent-strong))"
            >
              M
            </div>
            <div v-if="sidebarOpen" class="min-w-0">
              <h1 class="font-serif text-base font-semibold leading-tight tracking-tight">MeinDeutsch</h1>
              <p class="truncate text-[10px] text-[var(--sidebar-muted)]">{{ t.shell.tagline() }}</p>
            </div>
          </div>
        </div>

        <!-- Streak card -->
        <div class="px-3 pt-4">
          <div
            class="rounded-xl border border-[color-mix(in_srgb,var(--sidebar-muted)_22%,transparent)] bg-[color-mix(in_srgb,var(--sidebar-text)_6%,transparent)]"
            :class="sidebarOpen ? 'px-3 py-2.5' : 'flex justify-center px-0 py-2.5'"
            :title="streakStatusText"
          >
            <div class="flex items-center gap-2.5">
              <button
                class="relative inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-[color-mix(in_srgb,#f59e0b_18%,transparent)] transition hover:bg-[color-mix(in_srgb,#f59e0b_28%,transparent)]"
                type="button"
                @click="streakQuery.refetch()"
              >
                <Flame class="h-5 w-5 text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.6)]" />
                <span
                  v-if="streakSafeToday"
                  class="absolute -right-1 -top-1 flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500"
                >
                  <CheckCircle2 class="h-3 w-3 text-white" />
                </span>
              </button>
              <div v-if="sidebarOpen" class="min-w-0">
                <p class="text-sm font-bold leading-tight">
                  {{ streakQuery.isFetching.value && !streakQuery.data.value ? "…" : t.dailyTalk.streakLabel({ count: streakCount }) }}
                </p>
                <p class="mt-0.5 truncate text-[10px] leading-tight" :class="streakSafeToday ? 'text-emerald-400' : 'text-[var(--sidebar-muted)]'">
                  {{ streakStatusText }}
                </p>
              </div>
            </div>
          </div>
        </div>

        <nav class="mt-5 min-h-0 flex-1 space-y-1 overflow-y-auto px-2.5">
          <RouterLink
            v-for="item in navItems.filter((n) => n.key !== 'settings')"
            :key="item.key"
            :to="item.path"
            class="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all duration-150"
            :class="[sidebarItemClass(item.key), sidebarOpen ? '' : 'justify-center px-0']"
          >
            <component :is="item.icon" class="h-[18px] w-[18px] shrink-0" :class="activeNavKey === item.key ? 'text-[var(--accent)]' : ''" />
            <span v-if="sidebarOpen" class="truncate text-[13px] font-semibold">{{ item.title }}</span>
          </RouterLink>
        </nav>

        <div class="px-2.5 pb-2">
          <RouterLink
            to="/settings"
            class="flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-sm transition-all duration-150"
            :class="[sidebarItemClass('settings'), sidebarOpen ? '' : 'justify-center px-0']"
          >
            <Settings class="h-[18px] w-[18px] shrink-0" :class="activeNavKey === 'settings' ? 'text-[var(--accent)]' : ''" />
            <span v-if="sidebarOpen" class="truncate text-[13px] font-semibold">{{ t.settings.title() }}</span>
          </RouterLink>
        </div>

        <div class="shrink-0 border-t border-[color-mix(in_srgb,var(--sidebar-muted)_20%,transparent)] p-3">
          <div class="flex items-center gap-2.5" :class="sidebarOpen ? '' : 'justify-center'">
            <div
              class="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[11px] font-bold text-white"
              style="background-image: linear-gradient(135deg, var(--accent), var(--accent-strong))"
            >
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
              class="rounded-lg border border-[color-mix(in_srgb,var(--sidebar-muted)_28%,transparent)] p-1.5 text-[var(--sidebar-muted)] transition hover:border-[var(--accent)] hover:text-[var(--sidebar-text)]"
              :title="'Logout'"
              @click="logout"
            >
              <LogOut class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </aside>

      <section id="app-scroll" class="min-w-0 flex-1 overflow-y-auto bg-[var(--content-bg)]">
        <!-- Desktop header -->
        <header
          class="sticky top-0 z-20 hidden h-16 items-center gap-3 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--content-bg)_88%,transparent)] px-5 backdrop-blur-md lg:flex"
        >
          <button class="btn-icon h-8 w-8 rounded-lg" type="button" @click="toggleSidebar">
            <PanelLeft class="h-4 w-4" />
          </button>
          <div class="min-w-0">
            <p class="truncate font-serif text-[15px] font-semibold leading-tight">
              {{ greeting }}<span v-if="firstName">, {{ firstName }}</span> 👋
            </p>
            <p class="text-[11px] capitalize text-[var(--muted)]">{{ todayLabel }}</p>
          </div>
          <div class="ml-auto">
            <span
              class="inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-semibold"
              :class="streakSafeToday
                ? 'border-[color-mix(in_srgb,var(--status-good)_40%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_12%,var(--panel))] text-[var(--status-good)]'
                : 'border-[color-mix(in_srgb,var(--status-warn)_40%,var(--line))] bg-[color-mix(in_srgb,var(--status-warn)_12%,var(--panel))] text-[var(--status-warn)]'"
            >
              <CheckCircle2 v-if="streakSafeToday" class="h-3.5 w-3.5" />
              <Flame v-else class="h-3.5 w-3.5" />
              {{ streakStatusText }}
            </span>
          </div>
        </header>

        <!-- Mobile top bar -->
        <header
          class="sticky top-0 z-20 flex h-14 items-center gap-2.5 border-b border-[var(--line)] bg-[color-mix(in_srgb,var(--content-bg)_88%,transparent)] px-4 backdrop-blur-md lg:hidden"
        >
          <div
            class="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
            style="background-image: linear-gradient(135deg, var(--accent), var(--accent-strong))"
          >
            M
          </div>
          <p class="font-serif text-[15px] font-semibold tracking-tight">MeinDeutsch</p>
          <div class="ml-auto flex items-center gap-2">
            <span
              class="inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-bold"
              :class="streakSafeToday
                ? 'border-[color-mix(in_srgb,var(--status-good)_40%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_12%,var(--panel))] text-[var(--status-good)]'
                : 'border-[color-mix(in_srgb,var(--status-warn)_40%,var(--line))] bg-[color-mix(in_srgb,var(--status-warn)_12%,var(--panel))] text-[var(--status-warn)]'"
              :title="streakStatusText"
            >
              <Flame class="h-3.5 w-3.5" />
              {{ streakCount }}
            </span>
            <button
              class="rounded-lg border border-[var(--line)] p-1.5 text-[var(--muted)] transition hover:border-[var(--accent)] hover:text-[var(--text)]"
              :title="'Logout'"
              @click="logout"
            >
              <LogOut class="h-3.5 w-3.5" />
            </button>
          </div>
        </header>

        <div class="pb-24 lg:pb-0">
          <RouterView />
        </div>
      </section>
    </div>

    <!-- Mobile bottom nav -->
    <nav
      class="fixed inset-x-0 bottom-0 z-30 border-t border-[var(--line)] bg-[color-mix(in_srgb,var(--panel)_92%,transparent)] backdrop-blur-md lg:hidden"
      style="padding-bottom: env(safe-area-inset-bottom)"
    >
      <div class="mx-auto grid max-w-md grid-cols-5">
        <RouterLink
          v-for="item in navItems"
          :key="`tab-${item.key}`"
          :to="item.path"
          class="flex flex-col items-center gap-1 py-2.5 text-[10px] font-semibold transition"
          :class="activeNavKey === item.key ? 'text-[var(--accent-strong)]' : 'text-[var(--muted)]'"
        >
          <span
            class="flex h-7 w-11 items-center justify-center rounded-full transition"
            :class="activeNavKey === item.key ? 'bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]' : ''"
          >
            <component :is="item.icon" class="h-[18px] w-[18px]" />
          </span>
          <span class="max-w-full truncate px-0.5">{{ item.shortTitle }}</span>
        </RouterLink>
      </div>
    </nav>
  </main>
</template>
