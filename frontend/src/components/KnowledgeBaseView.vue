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
    <section class="animate-fade-up space-y-6">
      <header>
        <h2 class="page-title">{{ t.knowledge.title() }}</h2>
        <p class="page-subtitle">{{ t.settings.knowledgeDesc() }}</p>
      </header>

      <p v-if="notice" :class="notice.type === 'error' ? 'notice-error' : 'notice-success'">
        {{ notice.text }}
      </p>

      <section class="card p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <span class="eyebrow">
            <span class="eyebrow-icon"><Filter class="h-3 w-3" /></span>
            {{ t.knowledge.filters() }}
          </span>
        </div>
        <div class="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
          <label class="eyebrow">
            {{ t.knowledge.topic() }}
            <select v-model="filters.topicId" class="input mt-2 normal-case tracking-normal">
              <option value="">{{ t.common.all() }}</option>
              <option v-for="topic in topicsQuery.data.value ?? []" :key="topic.id" :value="String(topic.id)">
                {{ topic.name }}
              </option>
            </select>
          </label>
          <label class="eyebrow">
            {{ t.knowledge.limit() }}
            <input v-model="filters.limit" class="input mt-2 normal-case tracking-normal" type="number" min="1" />
          </label>
        </div>
      </section>

      <div v-if="knowledgeQuery.isFetching.value" class="flex items-center gap-2 text-xs text-[var(--muted)]">
        <Loader2 class="h-3.5 w-3.5 animate-spin" />
        {{ t.common.loading() }}
      </div>

      <div v-if="!items.length && !knowledgeQuery.isFetching.value" class="card border-dashed p-5 text-sm text-[var(--muted)]">
        {{ t.dailyTalk.noHistory() }}
      </div>

      <div class="space-y-2.5">
        <article v-for="item in items" :key="item.id" class="card card-hover p-4">
          <div class="flex items-start justify-between gap-3">
            <div class="min-w-0">
              <span class="chip-accent text-[10px]">{{ item.itemType }}</span>
              <p class="mt-2 text-xs leading-relaxed text-[var(--muted)]">{{ item.textChunk }}</p>
            </div>
            <span v-if="item.topicName" class="chip shrink-0 text-[10px]">{{ item.topicName }}</span>
          </div>
        </article>
      </div>
    </section>
  </AppContainer>
</template>
