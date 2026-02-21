<script setup lang="ts">
import { inject, computed } from "vue";
import { useRouter } from "vue-router";

const router = useRouter();
const baseUrlRef = inject<import("vue").Ref<string>>("baseUrl");

const baseUrlModel = computed({
  get: () => baseUrlRef?.value ?? "http://localhost:4000",
  set: (value: string) => {
    if (baseUrlRef) {
      baseUrlRef.value = value;
    }
  }
});

const cards = [
  {
    title: "Theme",
    description: "Pick a theme and preview your palette.",
    route: "/settings/theme"
  },
  {
    title: "Topics",
    description: "Manage the topic list used for Daily Talk questions.",
    route: "/settings/topics"
  },
  {
    title: "Knowledge Base",
    description: "Browse stored learner memory entries.",
    route: "/settings/knowledge"
  },
  {
    title: "API Trigger",
    description: "Manual endpoint testing and debugging tools.",
    route: "/settings/api"
  }
];
</script>

<template>
  <section class="space-y-4">
    <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <h3 class="text-lg font-semibold">Settings</h3>
      <p class="mt-1 text-sm text-[var(--muted)]">Configure shared settings and tools.</p>
      <div class="mt-4">
        <label class="mb-2 block text-sm text-[var(--muted)]">API Base URL</label>
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
</template>
