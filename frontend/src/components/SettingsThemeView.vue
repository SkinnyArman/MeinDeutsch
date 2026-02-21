<script setup lang="ts">
import { inject } from "vue";
import { THEME_MAP, THEMES, THEME_STORAGE_KEY, type ThemeKey, applyThemeTokens } from "../theme/themes";

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
  <section class="space-y-4">
    <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <h3 class="text-lg font-semibold">Theme</h3>
      <p class="mt-1 text-sm text-[var(--muted)]">Pick a theme that feels right for your learning flow.</p>
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
</template>
