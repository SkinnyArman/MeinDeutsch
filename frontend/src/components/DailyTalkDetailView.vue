<script setup lang="ts">
import { computed, ref, watchEffect } from "vue";
import { useRoute, useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import { ArrowLeft, Sparkles, Tag } from "lucide-vue-next";
import type { AnswerLogRecord } from "@/types/ApiTypes";
import { DEFAULT_CATEGORY } from "@/constants/app";
import AppContainer from "./AppContainer.vue";
import HighlightedText from "./HighlightedText.vue";
import { useDailyTalkDetailQuery, useDailyTalkSavedVocabQuery, useDailyTalkSaveWordMutation } from "@/queries/dailyTalk";

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

const { t } = useLanguage();
const route = useRoute();
const router = useRouter();
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);
const savingWordKey = ref<string | null>(null);

const submissionId = computed(() => {
  const param = route.params.id;
  return typeof param === "string" ? Number(param) : Number(param?.[0]);
});

const logQuery = useDailyTalkDetailQuery({ id: () => submissionId.value });
const vocabQuery = useDailyTalkSavedVocabQuery({
  answerLogId: () => logQuery.data.value?.id ?? null
});
const saveWordMutation = useDailyTalkSaveWordMutation();

watchEffect(() => {
  if (logQuery.error.value) {
    notice.value = { type: "error", text: logQuery.error.value.message };
  }
  if (vocabQuery.error.value) {
    notice.value = { type: "error", text: vocabQuery.error.value.message };
  }
  if (saveWordMutation.error.value) {
    notice.value = { type: "error", text: saveWordMutation.error.value.message };
  }
});

const savedWordKeys = computed(() => {
  const items = vocabQuery.data.value?.items ?? [];
  return new Set(items.map((item) => `${item.word}|${item.description}`));
});

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
    const overlaps = merged.some(
      (range) => !(extra.end <= range.start || extra.start >= range.end)
    );
    if (!overlaps) {
      merged.push(extra);
    }
  }
  return merged.sort((a, b) => a.start - b.start);
};

const highlightedAnswerSegments = computed(() => {
  if (!logQuery.data.value) {
    return [] as HighlightSegment[];
  }

  const answerText = logQuery.data.value.answerText;
  const errorRanges = logQuery.data.value.errorTypes
    .filter((error) => typeof error.start === "number" && typeof error.end === "number")
    .map((error) => ({ start: error.start as number, end: error.end as number }))
    .filter((range) => range.start >= 0 && range.end > range.start && range.end <= answerText.length);

  const diffRanges = buildDiffRanges(answerText, logQuery.data.value.correctedText);
  const mergedRanges = mergeRanges(errorRanges, diffRanges);

  const segments: HighlightSegment[] = [];
  let cursor = 0;
  for (const range of mergedRanges) {
    if (range.start < cursor) {
      continue;
    }
    if (range.start > cursor) {
      segments.push({ text: answerText.slice(cursor, range.start), highlight: false });
    }
    segments.push({ text: answerText.slice(range.start, range.end), highlight: true });
    cursor = range.end;
  }
  if (cursor < answerText.length) {
    segments.push({ text: answerText.slice(cursor), highlight: false });
  }
  return segments;
});

const handleSaveWord = async (payload: { word: string; description: string; examples: string[]; category: string }) => {
  savingWordKey.value = `${payload.word}|${payload.description}`;
  const data = await saveWordMutation.mutateAsync({
    ...payload,
    sourceAnswerLogId: logQuery.data.value?.id ?? undefined,
    sourceQuestionId: logQuery.data.value?.questionId ?? undefined
  });
  await vocabQuery.refetch();
  notice.value = { type: "success", text: data.created ? t.dailyTalkNew.wordSaved() : t.dailyTalkNew.wordAlready() };
  savingWordKey.value = null;
};
</script>

<template>
  <AppContainer>
    <section class="space-y-5">
      <header class="flex items-center justify-between">
        <div>
          <h2 class="font-serif text-3xl font-semibold tracking-tight">{{ t.dailyTalkDetail.title() }}</h2>
        </div>
        <button
          class="inline-flex items-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-1.5 text-xs transition hover:border-[var(--accent)]"
          @click="router.push('/daily-talk')"
        >
          <ArrowLeft class="h-3.5 w-3.5" />
          {{ t.common.back() }}
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

      <div v-if="logQuery.data.value" class="space-y-4">
        <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.dailyTalkNew.question() }}</p>
          <p class="mt-2 text-lg font-medium">{{ logQuery.data.value.questionText }}</p>
        </div>

        <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.dailyTalkNew.yourAnswer() }}</p>
          <HighlightedText class="mt-2" :segments="highlightedAnswerSegments" />
        </div>

        <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.dailyTalkNew.correctedText() }}</p>
          <p class="mt-2 text-sm text-[var(--muted)]">{{ logQuery.data.value.correctedText }}</p>
        </div>

        <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.dailyTalkNew.tips() }}</p>
          <ul class="mt-2 space-y-2 text-sm text-[var(--muted)]">
            <li v-for="(tip, idx) in logQuery.data.value.tips" :key="`tip-${idx}`">{{ tip }}</li>
          </ul>
        </div>

        <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.dailyTalkNew.errors() }}</p>
          <ul class="mt-2 space-y-2 text-sm text-[var(--muted)]">
            <li v-for="(error, idx) in logQuery.data.value.errorTypes" :key="`${error.type}-${idx}`" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2">
              <p class="text-sm font-semibold text-[var(--text)]">{{ error.message }}</p>
              <p class="mt-1 text-xs text-[var(--muted)]">{{ error.description }}</p>
            </li>
          </ul>
        </div>

        <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
          <div class="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">
            <Sparkles class="h-3.5 w-3.5" />
            {{ t.dailyTalkNew.wordSuggestions() }}
          </div>
          <div class="mt-3 space-y-3">
            <div
              v-for="(word, idx) in logQuery.data.value.contextualWordSuggestions"
              :key="`${word.word}-${idx}`"
              class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-3"
            >
              <div class="flex items-start justify-between gap-2">
                <div>
                  <p class="text-sm font-semibold">{{ word.word }}</p>
                  <p class="mt-1 text-xs text-[var(--muted)]">{{ word.description }}</p>
                </div>
                <button
                  class="inline-flex items-center gap-1 rounded-md border border-[var(--line)] px-2 py-1 text-[10px] transition hover:border-[var(--accent)] disabled:opacity-50"
                  :disabled="savingWordKey === `${word.word}|${word.description}` || savedWordKeys.has(`${word.word}|${word.description}`)"
                  @click="handleSaveWord({ word: word.word, description: word.description, examples: word.examples, category: logQuery.data.value.topicName || DEFAULT_CATEGORY })"
                >
                  <Tag class="h-3 w-3" />
                  {{ savedWordKeys.has(`${word.word}|${word.description}`) ? t.dailyTalkNew.wordSavedLabel() : t.dailyTalkNew.wordSave() }}
                </button>
              </div>
              <ul class="mt-2 space-y-1 text-xs text-[var(--muted)]">
                <li v-for="(example, exIdx) in word.examples" :key="`ex-${idx}-${exIdx}`">{{ example }}</li>
              </ul>
            </div>
          </div>
        </div>

        <div class="grid gap-3 md:grid-cols-2">
          <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.dailyTalkNew.cefrLevel() }}</p>
            <p class="mt-2 text-base font-semibold">{{ logQuery.data.value.cefrLevel }}</p>
          </div>
          <div class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
            <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.dailyTalkNew.modelUsed() }}</p>
            <p class="mt-2 text-base font-semibold">{{ logQuery.data.value.modelUsed }}</p>
          </div>
        </div>
      </div>
    </section>
  </AppContainer>
</template>
