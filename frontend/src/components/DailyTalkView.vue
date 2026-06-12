<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import { CalendarDays, ChevronLeft, ChevronRight, Plus } from "lucide-vue-next";
import AppContainer from "./AppContainer.vue";
import { useDailyTalkHistoryQuery } from "@/queries/dailyTalk";
import { DEFAULT_PAGE_SIZE } from "@/constants/app";

const router = useRouter();
const { t } = useLanguage();

const page = ref(1);
const pageSize = ref(DEFAULT_PAGE_SIZE);
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);

const historyQuery = useDailyTalkHistoryQuery({
  page: () => page.value,
  pageSize: pageSize.value
});

const history = computed(() => historyQuery.data.value?.items ?? []);
const totalPages = computed(() => historyQuery.data.value?.totalPages ?? 1);

watchEffect(() => {
  if (historyQuery.error.value) {
    notice.value = { type: "error", text: historyQuery.error.value.message };
  }
});

const goPrev = () => {
  if (page.value > 1) {
    page.value -= 1;
  }
};

const goNext = () => {
  if (page.value < totalPages.value) {
    page.value += 1;
  }
};
</script>

<template>
  <AppContainer>
    <section class="animate-fade-up space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 class="page-title">{{ t.dailyTalk.title() }}</h2>
          <p class="page-subtitle">{{ t.dailyTalk.history() }}</p>
        </div>
        <button class="btn-primary" @click="router.push('/daily-talk/new')">
          <Plus class="h-4 w-4" />
          {{ t.dailyTalk.newQuestion() }}
        </button>
      </header>

      <p v-if="notice" :class="notice.type === 'error' ? 'notice-error' : 'notice-success'">
        {{ notice.text }}
      </p>

      <div
        v-if="!history.length && !historyQuery.isFetching.value"
        class="card flex flex-col items-center gap-3 border-dashed px-6 py-12 text-center"
      >
        <span class="eyebrow-icon h-10 w-10 rounded-xl">
          <CalendarDays class="h-5 w-5" />
        </span>
        <p class="text-sm text-[var(--muted)]">{{ t.dailyTalk.noHistory() }}</p>
      </div>

      <div class="space-y-2.5">
        <article v-for="item in history" :key="item.id" class="card card-hover">
          <button
            class="flex w-full flex-col gap-2 p-4 text-left sm:flex-row sm:items-center sm:justify-between sm:gap-4"
            type="button"
            @click="router.push(`/daily-talk/${item.id}`)"
          >
            <div class="min-w-0">
              <p class="truncate text-[15px] font-semibold leading-snug">{{ item.questionText }}</p>
              <p class="mt-1 truncate text-xs text-[var(--muted)]">{{ item.answerText }}</p>
            </div>
            <div class="flex shrink-0 items-center gap-2">
              <span v-if="item.topicName" class="chip hidden sm:inline-flex">{{ item.topicName }}</span>
              <span class="chip-accent">{{ item.cefrLevel }}</span>
              <span class="chip">
                <CalendarDays class="h-3 w-3" />
                {{ new Date(item.createdAt).toLocaleDateString() }}
              </span>
            </div>
          </button>
        </article>
      </div>

      <div v-if="totalPages > 1" class="flex items-center justify-center gap-3 text-xs">
        <button class="btn-icon h-8 w-8" :disabled="page <= 1" @click="goPrev">
          <ChevronLeft class="h-4 w-4" />
        </button>
        <span class="font-medium text-[var(--muted)]">{{ t.common.page() }} {{ page }} {{ t.common.of() }} {{ totalPages }}</span>
        <button class="btn-icon h-8 w-8" :disabled="page >= totalPages" @click="goNext">
          <ChevronRight class="h-4 w-4" />
        </button>
      </div>
    </section>
  </AppContainer>
</template>
