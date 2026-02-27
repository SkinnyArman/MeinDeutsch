<script setup lang="ts">
import { computed, reactive, ref, watchEffect } from "vue";
import { useLanguage } from "@/libs/i18n";
import { Filter, Loader2 } from "lucide-vue-next";
import AppContainer from "./AppContainer.vue";
import { useKnowledgeQuery, useKnowledgeTopicsQuery } from "@/queries/knowledge";

const { t } = useLanguage();
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);

const filters = reactive({
  topicId: "",
  limit: "30"
});

const topicsQuery = useKnowledgeTopicsQuery();
const knowledgeQuery = useKnowledgeQuery({
  topicId: () => filters.topicId,
  limit: () => filters.limit
});

const items = computed(() => knowledgeQuery.data.value ?? []);

watchEffect(() => {
  if (topicsQuery.error.value) {
    notice.value = { type: "error", text: topicsQuery.error.value.message };
  }
  if (knowledgeQuery.error.value) {
    notice.value = { type: "error", text: knowledgeQuery.error.value.message };
  }
});
</script>

<template>
  <AppContainer>
    <section class="space-y-4">
      <header>
        <h2 class="font-serif text-3xl font-semibold tracking-tight">{{ t.knowledge.title() }}</h2>
      </header>

      <p
        v-if="notice"
        class="rounded-lg border px-3 py-2 text-xs"
        :class="notice.type === 'error'
          ? 'border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_14%,var(--panel))]'
          : 'border-[color-mix(in_srgb,var(--status-good)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))]'
        "
      >
        {{ notice.text }}
      </p>

      <section class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="text-lg font-medium">{{ t.knowledge.filters() }}</h3>
          <Filter class="h-4 w-4 text-[var(--muted)]" />
        </div>
        <div class="grid gap-3 md:grid-cols-3">
          <label class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {{ t.knowledge.topic() }}
            <select v-model="filters.topicId" class="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm">
              <option value="">{{ t.common.all() }}</option>
              <option v-for="topic in topicsQuery.data.value ?? []" :key="topic.id" :value="String(topic.id)">
                {{ topic.name }}
              </option>
            </select>
          </label>
          <label class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            {{ t.knowledge.limit() }}
            <input
              v-model="filters.limit"
              class="mt-2 w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
              type="number"
              min="1"
            />
          </label>
        </div>
      </section>

      <div v-if="knowledgeQuery.isFetching.value" class="flex items-center gap-2 text-xs text-[var(--muted)]">
        <Loader2 class="h-3.5 w-3.5 animate-spin" />
        {{ t.common.loading() }}
      </div>

      <div v-if="!items.length && !knowledgeQuery.isFetching.value" class="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
        {{ t.dailyTalk.noHistory() }}
      </div>

      <div class="space-y-2">
        <article
          v-for="item in items"
          :key="item.id"
          class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]"
        >
          <div class="flex items-center justify-between gap-2">
            <div>
              <p class="text-sm font-semibold">{{ item.itemType }}</p>
              <p class="mt-1 text-xs text-[var(--muted)]">{{ item.textChunk }}</p>
            </div>
            <span class="text-[10px] text-[var(--muted)]">{{ item.topicName || "-" }}</span>
          </div>
        </article>
      </div>
    </section>
  </AppContainer>
</template>
