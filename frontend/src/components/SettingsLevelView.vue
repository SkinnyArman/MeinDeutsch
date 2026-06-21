<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { useRouter } from "vue-router";
import { ArrowLeft, GraduationCap, RefreshCw } from "lucide-vue-next";
import { useLanguage } from "@/libs/i18n";
import { CEFR_LEVELS } from "@/types/ApiTypes";
import { useLevelQuery, useSetLevelMutation } from "@/queries/level";
import { setLevelKnown } from "@/utils/level";
import AppContainer from "./AppContainer.vue";

const router = useRouter();
const { t } = useLanguage();

const levelQuery = useLevelQuery();
const setLevelMutation = useSetLevelMutation();

const selected = ref<string>("");
const notice = ref<string | null>(null);

watch(
  () => levelQuery.data.value?.cefrLevel,
  (value) => {
    if (value && !selected.value) {
      selected.value = value;
    }
  },
  { immediate: true }
);

const assessedDate = computed(() => {
  const at = levelQuery.data.value?.cefrAssessedAt;
  return at ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(at)) : null;
});

const save = async (level: string): Promise<void> => {
  selected.value = level;
  await setLevelMutation.mutateAsync({ cefrLevel: level });
  setLevelKnown(true);
  await levelQuery.refetch();
  notice.value = t.level.saved();
};
</script>

<template>
  <AppContainer>
    <section class="animate-fade-up space-y-6">
      <header>
        <button
          class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
          @click="router.push('/settings')"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          {{ t.common.back() }}
        </button>
        <h2 class="page-title">{{ t.level.title() }}</h2>
        <p class="page-subtitle">{{ t.level.subtitle() }}</p>
      </header>

      <p v-if="notice" class="notice-success">{{ notice }}</p>

      <div class="card p-5">
        <div class="flex items-center gap-4">
          <span class="eyebrow-icon h-12 w-12 rounded-2xl">
            <GraduationCap class="h-6 w-6" />
          </span>
          <div>
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.level.current() }}</p>
            <p class="font-serif text-3xl font-semibold leading-tight">
              {{ levelQuery.data.value?.cefrLevel ?? t.level.notSet() }}
            </p>
            <p v-if="assessedDate" class="text-[11px] text-[var(--muted)]">{{ t.level.assessedOn({ date: assessedDate }) }}</p>
          </div>
        </div>

        <p v-if="levelQuery.data.value?.cefrRationale" class="mt-4 panel-inset p-3.5 text-sm leading-relaxed text-[var(--muted)]">
          {{ levelQuery.data.value.cefrRationale }}
        </p>

        <div class="mt-5">
          <p class="eyebrow">{{ t.level.adjust() }}</p>
          <div class="mt-2 flex flex-wrap gap-2">
            <button
              v-for="lvl in CEFR_LEVELS"
              :key="lvl"
              class="rounded-xl border px-4 py-2 text-sm font-bold transition"
              :class="selected === lvl
                ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel))] text-[var(--accent-strong)]'
                : 'border-[var(--line)] bg-[var(--panel)] text-[var(--muted)] hover:border-[var(--accent)]'"
              :disabled="setLevelMutation.isPending.value"
              @click="save(lvl)"
            >
              {{ lvl }}
            </button>
          </div>
        </div>
      </div>

      <button class="btn-ghost" @click="router.push('/onboarding')">
        <RefreshCw class="h-4 w-4" />
        {{ t.level.retake() }}
      </button>
    </section>
  </AppContainer>
</template>
