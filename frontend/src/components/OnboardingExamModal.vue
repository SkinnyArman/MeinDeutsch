<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useLanguage } from "@/libs/i18n";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, Sparkles } from "lucide-vue-next";
import type { UserLevelState } from "@/types/ApiTypes";
import { useAssessLevelMutation, useLevelExamQuery } from "@/queries/level";
import { markLeveled } from "@/utils/level";
import { BaseButton, BaseModal } from "./ui";

const emit = defineEmits<{ done: [] }>();
const { t } = useLanguage();

const examQuery = useLevelExamQuery();
const assessMutation = useAssessLevelMutation();

const questions = computed(() => examQuery.data.value?.questions ?? []);
const currentIndex = ref(0);
const answers = reactive<Record<number, string>>({});
const result = ref<UserLevelState | null>(null);
const notice = ref<string | null>(null);

const total = computed(() => questions.value.length);
const isLast = computed(() => currentIndex.value >= total.value - 1);
const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null);

const goBack = (): void => {
  if (currentIndex.value > 0) {
    currentIndex.value -= 1;
  }
};

const goNext = (): void => {
  if (currentIndex.value < total.value - 1) {
    currentIndex.value += 1;
  }
};

const submit = async (): Promise<void> => {
  notice.value = null;
  const payload = {
    answers: questions.value.map((q, i) => ({
      targetLevel: q.targetLevel,
      questionText: q.questionText,
      answerText: answers[i] ?? ""
    }))
  };
  try {
    result.value = await assessMutation.mutateAsync(payload);
  } catch {
    notice.value = t.onboarding.assessFailed();
  }
};

const finish = (): void => {
  markLeveled();
  emit("done");
};
</script>

<template>
  <!-- Blocking: cannot be dismissed until the exam is finished. -->
  <BaseModal :open="true" :dismissable="false" size="md">
    <!-- Result -->
    <div v-if="result" class="flex flex-col items-center text-center">
      <span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]">
        <CheckCircle2 class="h-8 w-8 text-[var(--accent)]" />
      </span>
      <p class="mt-5 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.onboarding.resultTitle() }}</p>
      <p class="mt-2 font-serif text-6xl font-semibold">{{ result.cefrLevel }}</p>
      <p v-if="result.cefrRationale" class="mt-4 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        {{ result.cefrRationale }}
      </p>
      <BaseButton class="mt-7" @click="finish">
        {{ t.onboarding.resultContinue() }}
        <template #icon><ArrowRight class="h-4 w-4" /></template>
      </BaseButton>
    </div>

    <!-- Assessing -->
    <div v-else-if="assessMutation.isPending.value" class="flex flex-col items-center py-10 text-center">
      <Loader2 class="h-8 w-8 animate-spin text-[var(--accent)]" />
      <p class="mt-4 text-sm text-[var(--muted)]">{{ t.onboarding.assessing() }}</p>
    </div>

    <!-- Exam -->
    <div v-else>
      <div class="flex items-center gap-2.5">
        <div
          class="flex h-9 w-9 items-center justify-center rounded-xl text-sm font-bold text-white"
          style="background-image: linear-gradient(135deg, var(--accent), var(--accent-strong))"
        >
          M
        </div>
        <h1 class="font-serif text-xl font-semibold leading-tight">{{ t.onboarding.title() }}</h1>
      </div>
      <p class="mt-3 text-sm leading-relaxed text-[var(--muted)]">{{ t.onboarding.subtitle() }}</p>

      <div v-if="examQuery.isFetching.value && !questions.length" class="flex items-center gap-2 py-10 text-sm text-[var(--muted)]">
        <Loader2 class="h-4 w-4 animate-spin" /> {{ t.common.loading() }}
      </div>
      <p v-else-if="examQuery.error.value" class="notice-error mt-6">{{ t.onboarding.loadFailed() }}</p>

      <div v-else-if="currentQuestion" class="mt-6">
        <!-- Progress dots -->
        <div class="mb-4 flex items-center gap-1.5">
          <span
            v-for="(_, i) in questions"
            :key="`dot-${i}`"
            class="h-1.5 flex-1 rounded-full transition"
            :class="i <= currentIndex ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'"
          />
        </div>

        <p class="eyebrow">
          <span class="eyebrow-icon"><Sparkles class="h-3 w-3" /></span>
          {{ t.onboarding.questionLabel({ n: currentIndex + 1, total }) }}
        </p>
        <p class="mt-3 font-serif text-xl leading-relaxed">{{ currentQuestion.questionText }}</p>

        <textarea
          v-model="answers[currentIndex]"
          class="input mt-4 min-h-[120px] resize-y"
          :placeholder="t.onboarding.answerPlaceholder()"
        />

        <p v-if="notice" class="notice-error mt-3">{{ notice }}</p>

        <div class="mt-5 flex items-center justify-between gap-3">
          <BaseButton variant="ghost" :disabled="currentIndex === 0" @click="goBack">
            <template #icon><ArrowLeft class="h-4 w-4" /></template>
            {{ t.onboarding.back() }}
          </BaseButton>
          <BaseButton v-if="!isLast" @click="goNext">
            {{ t.onboarding.next() }}
            <template #icon><ArrowRight class="h-4 w-4" /></template>
          </BaseButton>
          <BaseButton v-else @click="submit">
            <template #icon><CheckCircle2 class="h-4 w-4" /></template>
            {{ t.onboarding.submit() }}
          </BaseButton>
        </div>
      </div>
    </div>
  </BaseModal>
</template>
