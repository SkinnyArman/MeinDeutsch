<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import { apiBaseUrl, setApiBaseUrl } from "@/config/api";
import AppContainer from "./AppContainer.vue";

const router = useRouter();
const { t } = useLanguage();

const baseUrlModel = computed({
  get: () => apiBaseUrl.value,
  set: (value: string) => setApiBaseUrl(value)
});

const cards = computed(() => [
  {
    title: t.settings.theme(),
    description: t.settings.theme(),
    route: "/settings/theme"
  },
  {
    title: t.settings.topics(),
    description: t.settings.topics(),
    route: "/settings/topics"
  },
  {
    title: t.settings.knowledge(),
    description: t.settings.knowledge(),
    route: "/settings/knowledge"
  },
  {
    title: t.settings.apiTools(),
    description: t.settings.apiTools(),
    route: "/settings/api"
  }
]);
</script>

<template>
  <AppContainer>
    <section class="space-y-4">
      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <h3 class="text-lg font-semibold">{{ t.settings.title() }}</h3>
        <p class="mt-1 text-sm text-[var(--muted)]">{{ t.settings.title() }}</p>
        <div class="mt-4">
          <label class="mb-2 block text-sm text-[var(--muted)]">{{ t.settings.apiBaseUrl() }}</label>
          <input
            v-model="baseUrlModel"
            class="w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
            type="text"
            placeholder="http://localhost:4000"
          />
        </div>
      </article>

      <div class="grid gap-4 md:grid-cols-2">
        <button
          v-for="card in cards"
          :key="card.title"
          class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 text-left shadow-[var(--surface-shadow)] transition hover:border-[var(--accent)]"
          @click="router.push(card.route)"
        >
          <h4 class="text-lg font-semibold">{{ card.title }}</h4>
          <p class="mt-2 text-sm text-[var(--muted)]">{{ card.description }}</p>
        </button>
      </div>
    </section>
  </AppContainer>
</template>
