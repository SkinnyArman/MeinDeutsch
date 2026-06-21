<script setup lang="ts">
import { computed, reactive, ref, watch, watchEffect } from "vue";
import { useLanguage } from "@/libs/i18n";
import { Loader2, RefreshCw, Send, Sparkles, Tag } from "lucide-vue-next";
import type { AnalysisError, AnswerLogRecord, QuestionRecord, TopicRecord } from "@/types/ApiTypes";
import { DEFAULT_CATEGORY } from "@/constants/app";
import AppContainer from "./AppContainer.vue";
import HighlightedText from "./HighlightedText.vue";
import {
  useDailyTalkNextQuestionMutation,
  useDailyTalkSavedVocabQuery,
  useDailyTalkSaveWordMutation,
  useDailyTalkSubmitMutation,
  useDailyTalkTopicsQuery
} from "@/queries/dailyTalk";

type Notice = {
  type: "success" | "error";
  text: string;
};

const { t } = useLanguage();

const selectedTopicId = ref<string>("");
const generatedQuestion = ref<QuestionRecord | null>(null);
const result = ref<AnswerLogRecord | null>(null);
const notice = ref<Notice | null>(null);
const savingWordKey = ref<string | null>(null);

const form = reactive({
  answerText: ""
});

const answerWordCount = computed(() => {
  const trimmed = form.answerText.trim();
  if (!trimmed) {
    return 0;
  }
  return trimmed.split(/\s+/).length;
});

type HighlightSegment = {
  text: string;
  highlight: boolean;
  type?: string;
};

type TokenSpan = {
  token: string;
  start: number;
  end: number;
};

const tokenizeWithSpans = (text: string): TokenSpan[] => {
  return Array.from(text.matchAll(/\S+/g)).map((match) => ({
    token: match[0],
    start: match.index ?? 0,
    end: (match.index ?? 0) + match[0].length
  }));
};

const lcsIndices = (a: string[], b: string[]): Set<number> => {
  const dp = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }

  const indices = new Set<number>();
  let i = a.length;
  let j = b.length;
  while (i > 0 && j > 0) {
    if (a[i - 1] === b[j - 1]) {
      indices.add(i - 1);
      i -= 1;
      j -= 1;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      i -= 1;
    } else {
      j -= 1;
    }
  }

  return indices;
};

const buildDiffRanges = (answerText: string, correctedText: string): Array<{ start: number; end: number }> => {
  if (!answerText || !correctedText) {
    return [];
  }

  const answerTokens = tokenizeWithSpans(answerText);
  const correctedTokens = correctedText.split(/\s+/);
  const keep = lcsIndices(
    answerTokens.map((t) => t.token),
    correctedTokens
  );

  return answerTokens
    .filter((_, idx) => !keep.has(idx))
    .map((token) => ({ start: token.start, end: token.end }));
};

const mergeRanges = (
  baseRanges: Array<{ start: number; end: number }>,
  extraRanges: Array<{ start: number; end: number }>
): Array<{ start: number; end: number }> => {
  const merged = [...baseRanges];
  for (const extra of extraRanges) {
    const overlaps = merged.some((range) => !(extra.end <= range.start || extra.start >= range.end));
    if (!overlaps) {
      merged.push(extra);
    }
  }
  return merged.sort((a, b) => a.start - b.start);
};

// Tokens present in the corrected text but not shared with the answer (LCS) are
// the fixes — highlight them green.
const buildCorrectedSegments = (answerText: string, correctedText: string): HighlightSegment[] => {
  if (!correctedText) {
    return [];
  }
  const correctedTokens = tokenizeWithSpans(correctedText);
  const keep = lcsIndices(
    correctedTokens.map((t) => t.token),
    answerText.split(/\s+/)
  );

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  correctedTokens.forEach((token, idx) => {
    if (token.start > cursor) {
      segments.push({ text: correctedText.slice(cursor, token.start), highlight: false });
    }
    segments.push({ text: token.token, highlight: !keep.has(idx) });
    cursor = token.end;
  });
  if (cursor < correctedText.length) {
    segments.push({ text: correctedText.slice(cursor), highlight: false });
  }
  return segments;
};

const highlightedAnswerSegments = computed(() => {
  if (!result.value) {
    return [] as HighlightSegment[];
  }

  const errorRanges = result.value.errorTypes
    .filter((error) => typeof error.start === "number" && typeof error.end === "number")
    .map((error) => ({ start: error.start as number, end: error.end as number }))
    .filter((range) => range.start >= 0 && range.end > range.start && range.end <= result.value!.answerText.length);

  const diffRanges = buildDiffRanges(result.value.answerText, result.value.correctedText);
  const mergedRanges = mergeRanges(errorRanges, diffRanges);

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const range of mergedRanges) {
    if (range.start < cursor) {
      continue;
    }
    if (range.start > cursor) {
      segments.push({ text: result.value.answerText.slice(cursor, range.start), highlight: false });
    }
    segments.push({ text: result.value.answerText.slice(range.start, range.end), highlight: true });
    cursor = range.end;
  }
  if (cursor < result.value.answerText.length) {
    segments.push({ text: result.value.answerText.slice(cursor), highlight: false });
  }
  return segments;
});

// Mark the changed/added words in the corrected text (the inverse of the red
// diff on the answer side) so they can be highlighted green.
const correctedSegments = computed(() => {
  if (!result.value) {
    return [] as HighlightSegment[];
  }
  return buildCorrectedSegments(result.value.answerText, result.value.correctedText);
});

const topicsQuery = useDailyTalkTopicsQuery();
const hasNoTopics = computed(
  () => !topicsQuery.isFetching.value && (topicsQuery.data.value?.length ?? 0) === 0
);
const nextQuestionMutation = useDailyTalkNextQuestionMutation();
const submitMutation = useDailyTalkSubmitMutation();
const savedWordsQuery = useDailyTalkSavedVocabQuery({
  answerLogId: () => result.value?.id ?? null
});
const saveWordMutation = useDailyTalkSaveWordMutation();

watchEffect(() => {
  if (!selectedTopicId.value && topicsQuery.data.value?.length) {
    selectedTopicId.value = String(topicsQuery.data.value[0].id);
  }
});

watchEffect(() => {
  if (topicsQuery.error.value) {
    notice.value = { type: "error", text: topicsQuery.error.value.message };
  }
  if (nextQuestionMutation.error.value) {
    notice.value = { type: "error", text: nextQuestionMutation.error.value.message };
  }
  if (submitMutation.error.value) {
    notice.value = { type: "error", text: submitMutation.error.value.message };
  }
  if (savedWordsQuery.error.value) {
    notice.value = { type: "error", text: savedWordsQuery.error.value.message };
  }
  if (saveWordMutation.error.value) {
    notice.value = { type: "error", text: saveWordMutation.error.value.message };
  }
});

const handleNextQuestion = async (): Promise<void> => {
  if (!selectedTopicId.value) {
    notice.value = { type: "error", text: t.dailyTalkNew.pickTopic() };
    return;
  }
  const data = await nextQuestionMutation.mutateAsync({
    topicId: Number(selectedTopicId.value)
  });
  generatedQuestion.value = data as QuestionRecord;
  result.value = null;
  form.answerText = "";
  notice.value = null;
};

// Mirror Alltagssprache: a question loads from the pool on page open (once
// topics resolve) and a new one is drawn when the topic changes.
watch(selectedTopicId, () => {
  if (!selectedTopicId.value) {
    return;
  }
  void handleNextQuestion();
});

const handleSubmitAnswer = async (): Promise<void> => {
  if (!generatedQuestion.value) {
    notice.value = { type: "error", text: t.dailyTalkNew.questionFailed() };
    return;
  }
  const data = await submitMutation.mutateAsync({
    questionId: generatedQuestion.value.id,
    questionText: generatedQuestion.value.questionText,
    answerText: form.answerText.trim()
  });
  result.value = data as AnswerLogRecord;
  notice.value = { type: "success", text: t.dailyTalkNew.submitted() };
};

const savedWordKeys = computed(() => {
  const items = savedWordsQuery.data.value?.items ?? [];
  return new Set(items.map((item) => `${item.word}|${item.description}`));
});

const handleSaveWord = async (payload: { word: string; description: string; examples: string[]; category: string }) => {
  savingWordKey.value = `${payload.word}|${payload.description}`;
  const data = await saveWordMutation.mutateAsync({
    ...payload,
    sourceAnswerLogId: result.value?.id ?? undefined,
    sourceQuestionId: generatedQuestion.value?.id ?? undefined
  });
  await savedWordsQuery.refetch();
  notice.value = { type: "success", text: data.created ? t.dailyTalkNew.wordSaved() : t.dailyTalkNew.wordAlready() };
  savingWordKey.value = null;
};
</script>

<template>
  <AppContainer>
    <section class="animate-fade-up space-y-6">
      <header>
        <h2 class="page-title">{{ t.dailyTalkNew.title() }}</h2>
        <p class="page-subtitle">{{ t.dailyTalkNew.subtitle() }}</p>
      </header>

      <p v-if="notice" :class="notice.type === 'error' ? 'notice-error' : 'notice-success'">
        {{ notice.text }}
      </p>

      <div class="grid gap-5 md:grid-cols-[240px_1fr]">
        <aside class="card h-fit space-y-4 p-4 md:sticky md:top-20">
          <div>
            <label class="eyebrow">{{ t.dailyTalkNew.topic() }}</label>
            <select v-model="selectedTopicId" class="input mt-2">
              <option value="">{{ t.dailyTalkNew.pickTopic() }}</option>
              <option v-for="topic in (topicsQuery.data.value as TopicRecord[] | undefined) ?? []" :key="topic.id" :value="String(topic.id)">
                {{ topic.name }}
              </option>
            </select>
          </div>

          <button class="btn-soft w-full" :disabled="nextQuestionMutation.isPending.value || !selectedTopicId" @click="handleNextQuestion">
            <Loader2 v-if="nextQuestionMutation.isPending.value" class="h-4 w-4 animate-spin" />
            <RefreshCw v-else class="h-4 w-4" />
            {{ nextQuestionMutation.isPending.value ? t.dailyTalkNew.generating() : t.common.next() }}
          </button>
        </aside>

        <section class="space-y-4">
          <div class="card-hero p-5">
            <span class="eyebrow">
              <span class="eyebrow-icon">
                <Loader2 v-if="nextQuestionMutation.isPending.value" class="h-3 w-3 animate-spin" />
                <Sparkles v-else class="h-3 w-3" />
              </span>
              {{ t.dailyTalkNew.question() }}
            </span>
            <p class="mt-3 font-serif text-xl leading-relaxed sm:text-2xl">
              <template v-if="generatedQuestion?.questionText">{{ generatedQuestion.questionText }}</template>
              <template v-else-if="hasNoTopics">{{ t.dailyTalkNew.needTopic() }}</template>
              <template v-else>{{ t.common.loading() }}</template>
            </p>
          </div>

          <div class="card p-5">
            <div class="flex items-center justify-between">
              <p class="eyebrow">{{ t.dailyTalkNew.answerPrompt() }}</p>
              <span class="chip">{{ answerWordCount }} {{ t.dailyTalkNew.words() }}</span>
            </div>
            <textarea
              v-model="form.answerText"
              class="input mt-3 min-h-[140px] resize-y"
              :placeholder="t.dailyTalkNew.answerPlaceholder()"
            />
            <button
              class="btn-primary mt-3 w-full sm:w-auto"
              :disabled="submitMutation.isPending.value || !form.answerText.trim()"
              @click="handleSubmitAnswer"
            >
              <Loader2 v-if="submitMutation.isPending.value" class="h-4 w-4 animate-spin" />
              <Send v-else class="h-4 w-4" />
              {{ submitMutation.isPending.value ? t.dailyTalkNew.submitting() : t.dailyTalkNew.submit() }}
            </button>
          </div>

          <div v-if="result" class="animate-fade-up space-y-4">
            <div class="grid gap-4 sm:grid-cols-2">
              <div class="card p-5">
                <p class="eyebrow">{{ t.dailyTalkNew.yourAnswer() }}</p>
                <HighlightedText class="mt-3" :segments="highlightedAnswerSegments" />
              </div>

              <div class="card border-[color-mix(in_srgb,var(--status-good)_30%,var(--line))] p-5">
                <p class="eyebrow text-[var(--status-good)]">{{ t.dailyTalkNew.correctedText() }}</p>
                <HighlightedText class="mt-3" :segments="correctedSegments" tone="success" />
              </div>
            </div>

            <div class="flex flex-wrap items-center gap-2.5">
              <span class="chip">{{ result.modelUsed }}</span>
            </div>

            <div v-if="result.errorTypes.length" class="card p-5">
              <p class="eyebrow">{{ t.dailyTalkNew.errors() }}</p>
              <ul class="mt-3 space-y-2.5">
                <li
                  v-for="(error, idx) in result.errorTypes"
                  :key="`${error.type}-${idx}`"
                  class="panel-inset border-l-2 border-l-[var(--status-bad)] px-3.5 py-3"
                >
                  <p class="text-sm font-semibold">{{ error.message }}</p>
                  <p class="mt-1 text-xs leading-relaxed text-[var(--muted)]">{{ error.description }}</p>
                </li>
              </ul>
            </div>

            <div v-if="result.tips.length" class="card p-5">
              <p class="eyebrow">{{ t.dailyTalkNew.tips() }}</p>
              <ul class="mt-3 space-y-2.5">
                <li
                  v-for="(tip, idx) in result.tips"
                  :key="`tip-${idx}`"
                  class="flex items-start gap-2.5 text-sm leading-relaxed text-[var(--muted)]"
                >
                  <span class="eyebrow-icon mt-0.5 shrink-0">
                    <Sparkles class="h-3 w-3" />
                  </span>
                  <span>{{ tip }}</span>
                </li>
              </ul>
            </div>

            <div v-if="result.contextualWordSuggestions.length" class="card p-5">
              <p class="eyebrow">
                <span class="eyebrow-icon"><Sparkles class="h-3 w-3" /></span>
                {{ t.dailyTalkNew.wordSuggestions() }}
              </p>
              <div class="mt-3 grid gap-3 sm:grid-cols-2">
                <div
                  v-for="(word, idx) in result.contextualWordSuggestions"
                  :key="`${word.word}-${idx}`"
                  class="panel-inset flex flex-col p-3.5"
                >
                  <div class="flex items-start justify-between gap-2">
                    <div class="min-w-0">
                      <p class="text-sm font-bold">{{ word.word }}</p>
                      <p class="mt-1 text-xs leading-relaxed text-[var(--muted)]">{{ word.description }}</p>
                    </div>
                    <button
                      class="btn-soft shrink-0 px-2.5 py-1.5 text-[11px]"
                      :disabled="savingWordKey === `${word.word}|${word.description}` || savedWordKeys.has(`${word.word}|${word.description}`)"
                      @click="handleSaveWord({ word: word.word, description: word.description, examples: word.examples, category: result.topicName || DEFAULT_CATEGORY })"
                    >
                      <Tag class="h-3 w-3" />
                      {{ savedWordKeys.has(`${word.word}|${word.description}`) ? t.dailyTalkNew.wordSavedLabel() : t.dailyTalkNew.wordSave() }}
                    </button>
                  </div>
                  <ul class="mt-2.5 space-y-1.5">
                    <li
                      v-for="(example, exIdx) in word.examples"
                      :key="`ex-${idx}-${exIdx}`"
                      class="border-l-2 border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] pl-2.5 text-xs italic leading-relaxed text-[var(--muted)]"
                    >
                      {{ example }}
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  </AppContainer>
</template>
