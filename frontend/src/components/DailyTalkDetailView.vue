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
    <section class="animate-fade-up space-y-6">
      <header class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <button
            class="mb-2 inline-flex items-center gap-1.5 text-xs font-medium text-[var(--muted)] transition hover:text-[var(--accent)]"
            @click="router.push('/daily-talk')"
          >
            <ArrowLeft class="h-3.5 w-3.5" />
            {{ t.common.back() }}
          </button>
          <h2 class="page-title">{{ t.dailyTalkDetail.title() }}</h2>
        </div>
      </header>

      <p v-if="notice" :class="notice.type === 'error' ? 'notice-error' : 'notice-success'">
        {{ notice.text }}
      </p>

      <div v-if="logQuery.data.value" class="space-y-4">
        <div class="card-hero p-5">
          <p class="eyebrow">{{ t.dailyTalkNew.question() }}</p>
          <p class="mt-3 font-serif text-xl leading-relaxed sm:text-2xl">{{ logQuery.data.value.questionText }}</p>
        </div>

        <div class="grid gap-4 sm:grid-cols-2">
          <div class="card p-5">
            <p class="eyebrow">{{ t.dailyTalkNew.yourAnswer() }}</p>
            <HighlightedText class="mt-3" :segments="highlightedAnswerSegments" />
          </div>

          <div class="card border-[color-mix(in_srgb,var(--status-good)_30%,var(--line))] p-5">
            <p class="eyebrow text-[var(--status-good)]">{{ t.dailyTalkNew.correctedText() }}</p>
            <p class="mt-3 text-sm leading-relaxed">{{ logQuery.data.value.correctedText }}</p>
          </div>
        </div>

        <div class="flex flex-wrap items-center gap-2.5">
          <span class="chip-accent px-3 py-1.5 text-sm">{{ t.dailyTalkNew.cefrLevel() }} · {{ logQuery.data.value.cefrLevel }}</span>
          <span class="chip">{{ logQuery.data.value.modelUsed }}</span>
        </div>

        <div v-if="logQuery.data.value.errorTypes.length" class="card p-5">
          <p class="eyebrow">{{ t.dailyTalkNew.errors() }}</p>
          <ul class="mt-3 space-y-2.5">
            <li
              v-for="(error, idx) in logQuery.data.value.errorTypes"
              :key="`${error.type}-${idx}`"
              class="panel-inset border-l-2 border-l-[var(--status-bad)] px-3.5 py-3"
            >
              <p class="text-sm font-semibold">{{ error.message }}</p>
              <p class="mt-1 text-xs leading-relaxed text-[var(--muted)]">{{ error.description }}</p>
            </li>
          </ul>
        </div>

        <div v-if="logQuery.data.value.tips.length" class="card p-5">
          <p class="eyebrow">{{ t.dailyTalkNew.tips() }}</p>
          <ul class="mt-3 space-y-2.5">
            <li
              v-for="(tip, idx) in logQuery.data.value.tips"
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

        <div v-if="logQuery.data.value.contextualWordSuggestions.length" class="card p-5">
          <p class="eyebrow">
            <span class="eyebrow-icon"><Sparkles class="h-3 w-3" /></span>
            {{ t.dailyTalkNew.wordSuggestions() }}
          </p>
          <div class="mt-3 grid gap-3 sm:grid-cols-2">
            <div
              v-for="(word, idx) in logQuery.data.value.contextualWordSuggestions"
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
                  @click="handleSaveWord({ word: word.word, description: word.description, examples: word.examples, category: logQuery.data.value.topicName || DEFAULT_CATEGORY })"
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
  </AppContainer>
</template>
