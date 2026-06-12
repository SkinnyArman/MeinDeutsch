<script setup lang="ts">
import { computed } from "vue";
import { useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import { ChevronRight, Database, MessageSquareText, Palette, Wrench } from "lucide-vue-next";
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
    description: t.settings.themeDesc(),
    route: "/settings/theme",
    icon: Palette
  },
  {
    title: t.settings.topics(),
    description: t.settings.topicsDesc(),
    route: "/settings/topics",
    icon: MessageSquareText
  },
  {
    title: t.settings.knowledge(),
    description: t.settings.knowledgeDesc(),
    route: "/settings/knowledge",
    icon: Database
  },
  {
    title: t.settings.apiTools(),
    description: t.settings.apiToolsDesc(),
    route: "/settings/api",
    icon: Wrench
  }
]);
</script>

<template>
  <AppContainer>
    <section class="animate-fade-up space-y-6">
      <header>
        <h2 class="page-title">{{ t.settings.title() }}</h2>
        <p class="page-subtitle">{{ t.settings.subtitle() }}</p>
      </header>

      <div class="grid gap-4 sm:grid-cols-2">
        <button
          v-for="card in cards"
          :key="card.title"
          class="card card-hover group flex items-center gap-4 p-5 text-left"
          @click="router.push(card.route)"
        >
          <span class="eyebrow-icon h-11 w-11 shrink-0 rounded-xl">
            <component :is="card.icon" class="h-5 w-5" />
          </span>
          <span class="min-w-0 flex-1">
            <span class="block text-base font-semibold">{{ card.title }}</span>
            <span class="mt-0.5 block text-xs text-[var(--muted)]">{{ card.description }}</span>
          </span>
          <ChevronRight class="h-4 w-4 shrink-0 text-[var(--muted)] transition group-hover:translate-x-0.5 group-hover:text-[var(--accent)]" />
        </button>
      </div>

      <article class="card p-5">
        <label class="eyebrow">{{ t.settings.apiBaseUrl() }}</label>
        <input v-model="baseUrlModel" class="input mt-2.5" type="text" placeholder="http://localhost:4000" />
      </article>
    </section>
  </AppContainer>
</template>
