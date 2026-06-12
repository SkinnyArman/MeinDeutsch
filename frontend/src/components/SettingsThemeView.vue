<script setup lang="ts">
import { inject } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, Check } from "lucide-vue-next";
import { useLanguage } from "@/libs/i18n";
import { THEME_MAP, THEMES, THEME_STORAGE_KEY, type ThemeKey, applyThemeTokens } from "../theme/themes";
import AppContainer from "./AppContainer.vue";

const router = useRouter();
const { t } = useLanguage();
const activeTheme = inject<import("vue").Ref<ThemeKey>>("activeTheme");
const setActiveTheme = inject<(value: ThemeKey) => void>("setActiveTheme");

const handleThemeClick = (key: ThemeKey): void => {
  if (!setActiveTheme) {
    return;
  }

  setActiveTheme(key);
  applyThemeTokens(THEME_MAP[key]);
  window.localStorage.setItem(THEME_STORAGE_KEY, key);
};
</script>

<template>
  <AppContainer>
    <section class="animate-fade-up space-y-6">
      <header>
        <button
          class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
          @click="router.push('/settings')"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          {{ t.common.back() }}
        </button>
        <h2 class="page-title">{{ t.settings.theme() }}</h2>
        <p class="page-subtitle">{{ t.settings.themeDesc() }}</p>
      </header>

      <div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <button
          v-for="theme in THEMES"
          :key="theme.key"
          class="card card-hover relative flex flex-col items-start gap-3 p-4"
          :class="activeTheme?.value === theme.key
            ? 'border-[var(--accent)] shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_25%,transparent)]'
            : ''"
          @click="handleThemeClick(theme.key)"
        >
          <span
            v-if="activeTheme?.value === theme.key"
            class="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[var(--accent)]"
          >
            <Check class="h-3 w-3 text-white" />
          </span>
          <span class="flex items-center">
            <span
              v-for="(color, idx) in theme.swatch"
              :key="`${theme.key}-${idx}`"
              class="h-8 w-8 rounded-full border-2 border-[var(--panel)]"
              :class="idx > 0 ? '-ml-2.5' : ''"
              :style="{ backgroundColor: color }"
            />
          </span>
          <span class="text-sm font-semibold">{{ theme.label }}</span>
        </button>
      </div>
    </section>
  </AppContainer>
</template>
