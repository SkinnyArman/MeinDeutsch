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
    <section class="space-y-5">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="font-serif text-3xl font-semibold tracking-tight">{{ t.dailyTalk.title() }}</h2>
          <p class="mt-1 text-xs text-[var(--muted)]">{{ t.dailyTalk.history() }}</p>
        </div>
        <button
          class="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs font-medium transition hover:border-[var(--accent)]"
          @click="router.push('/daily-talk/new')"
        >
          <Plus class="h-3.5 w-3.5" />
          {{ t.dailyTalk.newQuestion() }}
        </button>
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

      <div class="flex items-center justify-end gap-2 text-xs">
        <button
          class="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-1 transition hover:border-[var(--accent)] disabled:opacity-60"
          :disabled="page <= 1"
          @click="goPrev"
        >
          <ChevronLeft class="h-3.5 w-3.5" />
          {{ t.common.previous() }}
        </button>
        <span class="text-[var(--muted)]">{{ t.common.page() }} {{ page }} {{ t.common.of() }} {{ totalPages }}</span>
        <button
          class="inline-flex items-center gap-1 rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-1 transition hover:border-[var(--accent)] disabled:opacity-60"
          :disabled="page >= totalPages"
          @click="goNext"
        >
          {{ t.common.next() }}
          <ChevronRight class="h-3.5 w-3.5" />
        </button>
      </div>

      <div v-if="!history.length && !historyQuery.isFetching.value" class="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
        {{ t.dailyTalk.noHistory() }}
      </div>

      <div class="space-y-2">
        <article
          v-for="item in history"
          :key="item.id"
          class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)] transition hover:border-[var(--accent)]"
        >
          <button class="flex w-full items-start justify-between gap-3 text-left" type="button" @click="router.push(`/daily-talk/${item.id}`)">
            <div class="min-w-0">
              <p class="truncate text-sm font-semibold">{{ item.questionText }}</p>
              <p class="mt-1 truncate text-xs text-[var(--muted)]">{{ item.answerText }}</p>
            </div>
            <div class="flex items-center gap-2 text-[10px] text-[var(--muted)]">
              <CalendarDays class="h-3.5 w-3.5" />
              <span>{{ new Date(item.createdAt).toLocaleDateString() }}</span>
            </div>
          </button>
        </article>
      </div>
    </section>
  </AppContainer>
</template>
