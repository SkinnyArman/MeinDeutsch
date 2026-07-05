<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import { useLanguage } from "@/libs/i18n";
import { ArrowLeft, ArrowRight, CheckCircle2, Loader2, PencilLine, Sparkles } from "lucide-vue-next";
import type { UserLevelState } from "@/types/ApiTypes";
import { useAssessLevelMutation, useLevelExamQuery } from "@/queries/level";
import { markLeveled } from "@/utils/level";
import { BaseButton, BaseModal } from "./ui";

type Stage = "self" | "mcq" | "writing";

withDefaults(defineProps<{ dismissable?: boolean }>(), { dismissable: false });
const emit = defineEmits<{ done: []; close: [] }>();
const { t } = useLanguage();

const examQuery = useLevelExamQuery();
const assessMutation = useAssessLevelMutation();

const questions = computed(() => examQuery.data.value?.questions ?? []);
const selfOptions = computed(() => examQuery.data.value?.selfAssessmentOptions ?? []);
const writingPrompt = computed(() => examQuery.data.value?.writingPrompt ?? "");

const stage = ref<Stage>("self");
const currentIndex = ref(0);
const selfEstimate = ref<string>("unknown");
const selectedAnswers = reactive<Record<string, string>>({});
const writingAnswer = ref("");
const result = ref<UserLevelState | null>(null);
const notice = ref<string | null>(null);

const total = computed(() => questions.value.length);
const currentQuestion = computed(() => questions.value[currentIndex.value] ?? null);
const answeredCount = computed(() => questions.value.filter((question) => selectedAnswers[question.id]).length);
const isLastQuestion = computed(() => currentIndex.value >= total.value - 1);
const currentSelection = computed(() => currentQuestion.value ? selectedAnswers[currentQuestion.value.id] : "");
const canContinueSelf = computed(() => Boolean(selfEstimate.value));
const canContinueMcq = computed(() => Boolean(currentSelection.value));

const progressLabel = computed(() => {
  if (stage.value === "self") {
    return "Step 1 of 3";
  }
  if (stage.value === "writing") {
    return "Step 3 of 3";
  }
  return `Question ${currentIndex.value + 1} of ${total.value}`;
});

const chooseAnswer = (optionId: string): void => {
  if (!currentQuestion.value) {
    return;
  }
  selectedAnswers[currentQuestion.value.id] = optionId;
};

const goBack = (): void => {
  notice.value = null;
  if (stage.value === "writing") {
    stage.value = "mcq";
    currentIndex.value = Math.max(0, total.value - 1);
    return;
  }
  if (stage.value === "mcq") {
    if (currentIndex.value > 0) {
      currentIndex.value -= 1;
      return;
    }
    stage.value = "self";
  }
};

const goNext = (): void => {
  notice.value = null;
  if (stage.value === "self") {
    stage.value = "mcq";
    return;
  }
  if (stage.value === "mcq") {
    if (!canContinueMcq.value) {
      notice.value = "Choose one answer to continue.";
      return;
    }
    if (isLastQuestion.value) {
      stage.value = "writing";
      return;
    }
    currentIndex.value += 1;
  }
};

const submit = async (): Promise<void> => {
  notice.value = null;
  const missing = questions.value.find((question) => !selectedAnswers[question.id]);
  if (missing) {
    stage.value = "mcq";
    currentIndex.value = Math.max(0, questions.value.findIndex((question) => question.id === missing.id));
    notice.value = "Answer this question before finishing.";
    return;
  }

  try {
    result.value = await assessMutation.mutateAsync({
      selfEstimate: selfEstimate.value,
      answers: questions.value.map((question) => ({
        questionId: question.id,
        selectedOptionId: selectedAnswers[question.id]
      })),
      writingAnswer: writingAnswer.value
    });
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
  <BaseModal :open="true" :dismissable="dismissable" size="md" @close="emit('close')">
    <div v-if="result" class="flex flex-col items-center text-center">
      <span class="flex h-16 w-16 items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--accent)_16%,transparent)]">
        <CheckCircle2 class="h-8 w-8 text-[var(--accent)]" />
      </span>
      <p class="mt-5 text-xs font-semibold uppercase text-[var(--muted)]">{{ t.onboarding.resultTitle() }}</p>
      <p class="mt-2 font-serif text-6xl font-semibold">{{ result.cefrLevel }}</p>
      <p v-if="result.cefrRationale" class="mt-4 max-w-md text-sm leading-relaxed text-[var(--muted)]">
        {{ result.cefrRationale }}
      </p>
      <BaseButton class="mt-7" @click="finish">
        {{ t.onboarding.resultContinue() }}
        <template #icon><ArrowRight class="h-4 w-4" /></template>
      </BaseButton>
    </div>

    <div v-else-if="assessMutation.isPending.value" class="flex flex-col items-center py-10 text-center">
      <Loader2 class="h-8 w-8 animate-spin text-[var(--accent)]" />
      <p class="mt-4 text-sm text-[var(--muted)]">{{ t.onboarding.assessing() }}</p>
    </div>

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

      <div v-else class="mt-6">
        <div class="mb-4 flex items-center gap-1.5">
          <span class="h-1.5 flex-1 rounded-full" :class="stage === 'self' ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'" />
          <span class="h-1.5 flex-[3] rounded-full" :class="stage === 'mcq' ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'" />
          <span class="h-1.5 flex-1 rounded-full" :class="stage === 'writing' ? 'bg-[var(--accent)]' : 'bg-[var(--line)]'" />
        </div>

        <p class="eyebrow">
          <span class="eyebrow-icon"><Sparkles class="h-3 w-3" /></span>
          {{ progressLabel }}
        </p>

        <section v-if="stage === 'self'" class="mt-4">
          <h2 class="font-serif text-xl font-semibold">Where do you think you are?</h2>
          <div class="mt-4 grid gap-2">
            <button
              v-for="option in selfOptions"
              :key="option.level"
              type="button"
              class="rounded-xl border p-3 text-left transition"
              :class="selfEstimate === option.level
                ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)]'
                : 'border-[var(--line)] hover:border-[var(--accent)]'"
              @click="selfEstimate = option.level"
            >
              <span class="text-sm font-bold">{{ option.label }}</span>
              <span class="mt-1 block text-xs leading-relaxed text-[var(--muted)]">{{ option.description }}</span>
            </button>
          </div>
        </section>

        <section v-else-if="stage === 'mcq' && currentQuestion" class="mt-4">
          <div class="flex items-center justify-between gap-3">
            <p class="text-xs font-semibold uppercase text-[var(--muted)]">{{ currentQuestion.targetLevel }} · {{ currentQuestion.skill }}</p>
            <p class="text-xs font-semibold text-[var(--muted)]">{{ answeredCount }}/{{ total }}</p>
          </div>
          <h2 class="mt-3 font-serif text-xl leading-relaxed">{{ currentQuestion.prompt }}</h2>
          <div class="mt-4 grid gap-2">
            <button
              v-for="option in currentQuestion.options"
              :key="option.id"
              type="button"
              class="rounded-xl border p-3 text-left text-sm font-medium transition"
              :class="currentSelection === option.id
                ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_12%,transparent)] text-[var(--text)]'
                : 'border-[var(--line)] hover:border-[var(--accent)]'"
              @click="chooseAnswer(option.id)"
            >
              {{ option.text }}
            </button>
          </div>
        </section>

        <section v-else-if="stage === 'writing'" class="mt-4">
          <p class="eyebrow">
            <span class="eyebrow-icon"><PencilLine class="h-3 w-3" /></span>
            Tiny writing sample
          </p>
          <h2 class="mt-3 font-serif text-xl leading-relaxed">{{ writingPrompt }}</h2>
          <textarea
            v-model="writingAnswer"
            class="input mt-4 min-h-[112px] resize-y"
            placeholder="3-5 kurze Saetze reichen."
          />
        </section>

        <p v-if="notice" class="notice-error mt-3">{{ notice }}</p>

        <div class="mt-5 flex items-center justify-between gap-3">
          <BaseButton v-if="stage !== 'self'" variant="ghost" @click="goBack">
            <template #icon><ArrowLeft class="h-4 w-4" /></template>
            {{ t.onboarding.back() }}
          </BaseButton>
          <span v-else />

          <BaseButton v-if="stage !== 'writing'" :disabled="stage === 'self' ? !canContinueSelf : !canContinueMcq" @click="goNext">
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
