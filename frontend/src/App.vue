<script setup lang="ts">
import { ref } from "vue";
import ApiTriggerView from "./components/ApiTriggerView.vue";
import TopicsQuestionsView from "./components/TopicsQuestionsView.vue";

type ViewKey = "api-trigger" | "topics-questions";

const activeView = ref<ViewKey>("api-trigger");

const navItems: Array<{ key: ViewKey; title: string; subtitle: string }> = [
  {
    key: "api-trigger",
    title: "API Trigger",
    subtitle: "Current full endpoint playground"
  },
  {
    key: "topics-questions",
    title: "Topics & Questions",
    subtitle: "Dedicated workflow for topic/question APIs"
  }
];
</script>

<template>
  <main class="min-h-screen p-4 md:p-6">
    <div class="mx-auto flex w-full max-w-7xl flex-col gap-4 md:flex-row">
      <aside class="w-full rounded-xl border border-line bg-panel p-3 md:w-72 md:self-start">
        <h1 class="mb-3 px-2 text-lg font-semibold">MeinDeutsch</h1>
        <nav class="space-y-2">
          <button
            v-for="item in navItems"
            :key="item.key"
            class="w-full rounded-lg border px-3 py-2 text-left transition"
            :class="
              activeView === item.key
                ? 'border-cyan-500 bg-cyan-500/10 text-cyan-200'
                : 'border-transparent bg-slate-900 text-slate-300 hover:border-line hover:text-slate-100'
            "
            @click="activeView = item.key"
          >
            <p class="text-sm font-medium">{{ item.title }}</p>
            <p class="text-xs opacity-80">{{ item.subtitle }}</p>
          </button>
        </nav>
      </aside>

      <section class="min-w-0 flex-1 rounded-xl border border-line bg-slate-950/60 p-4 md:p-6">
        <header class="mb-6">
          <h2 class="text-2xl font-semibold tracking-tight">
            {{ activeView === "api-trigger" ? "API Trigger" : "Topics & Questions" }}
          </h2>
          <p class="mt-1 text-sm text-slate-400">
            {{
              activeView === "api-trigger"
                ? "Run any backend endpoint from one page."
                : "Use the focused flow: create topics and generate questions."
            }}
          </p>
        </header>

        <ApiTriggerView v-if="activeView === 'api-trigger'" />
        <TopicsQuestionsView v-else />
      </section>
    </div>
  </main>
</template>
