<script setup lang="ts">
import { inject } from "vue";
import { useLanguage } from "@/libs/i18n";
import { THEME_MAP, THEMES, THEME_STORAGE_KEY, type ThemeKey, applyThemeTokens } from "../theme/themes";
import AppContainer from "./AppContainer.vue";

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
    <section class="space-y-4">
      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <h3 class="text-lg font-semibold">{{ t.settings.theme() }}</h3>
        <p class="mt-1 text-sm text-[var(--muted)]">{{ t.settings.theme() }}</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <div class="flex flex-wrap gap-2">
          <button
            v-for="theme in THEMES"
            :key="theme.key"
            :title="theme.label"
            class="relative flex h-12 w-12 items-center justify-center rounded-full border border-[var(--line)] bg-[var(--panel-soft)] transition"
            :class="activeTheme?.value === theme.key ? 'border-[var(--accent)] shadow-[0_0_0_2px_color-mix(in_srgb,var(--accent)_30%,transparent)]' : ''"
            @click="handleThemeClick(theme.key)"
          >
            <span class="h-3 w-3 rounded-full" :style="{ backgroundColor: theme.swatch[0] }" />
            <span class="-ml-1 h-3 w-3 rounded-full" :style="{ backgroundColor: theme.swatch[1] }" />
            <span class="-ml-1 h-3 w-3 rounded-full" :style="{ backgroundColor: theme.swatch[2] }" />
          </button>
        </div>
      </article>
    </section>
  </AppContainer>
</template>
