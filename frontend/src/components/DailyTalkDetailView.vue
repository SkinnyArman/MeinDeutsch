<script setup lang="ts">
import { inject, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";
import { authFetch } from "../utils/auth";

interface ApiErrorBody {
  code: string;
  details?: unknown;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: ApiErrorBody | null;
}

interface AnalysisError {
  type: string;
  message: string;
  description: string;
  evidence: string;
  correction: string;
  start: number | null;
  end: number | null;
  severity: number;
}

interface ContextualWordSuggestion {
  word: string;
  description: string;
  examples: string[];
}

interface AnswerLogRecord {
  id: number;
  questionId: number | null;
  topicId?: number | null;
  topicName?: string;
  questionText: string;
  answerText: string;
  correctedText: string;
  cefrLevel: string;
  errorTypes: AnalysisError[];
  tips: string[];
  contextualWordSuggestions: ContextualWordSuggestion[];
  modelUsed: string;
  createdAt: string;
}

interface SavedVocabularyPayload {
  entry: {
    id: number;
    category: string;
  };
  created: boolean;
}

interface VocabularyItemRecord {
  id: number;
  word: string;
  description: string;
  sourceAnswerLogId: number | null;
}

const props = defineProps<{
  id?: string;
}>();

const baseUrl = inject<import("vue").Ref<string>>("baseUrl")?.value ?? "http://localhost:4000";
const route = useRoute();
const router = useRouter();

const loading = ref(false);
const log = ref<AnswerLogRecord | null>(null);
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);
const savingWordKey = ref<string | null>(null);
const savedWordKeys = ref<Set<string>>(new Set());

const notifyError = (text: string): void => {
  notice.value = { type: "error", text };
};

const notifySuccess = (text: string): void => {
  notice.value = { type: "success", text };
};

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
    const overlaps = merged.some(
      (range) => !(extra.end <= range.start || extra.start >= range.end)
    );
    if (!overlaps) {
      merged.push(extra);
    }
  }
  return merged.sort((a, b) => a.start - b.start);
};

const buildHighlightedSegments = (text: string, errors: AnalysisError[]): HighlightSegment[] => {
  if (!text) {
    return [];
  }

  const ranges = errors
    .filter((error) => typeof error.start === "number" && typeof error.end === "number")
    .map((error) => ({
      start: error.start as number,
      end: error.end as number,
      type: error.type
    }))
    .filter((range) => range.start >= 0 && range.end > range.start && range.end <= text.length)
    .sort((a, b) => a.start - b.start);

  const segments: HighlightSegment[] = [];
  let cursor = 0;

  for (const range of ranges) {
    if (range.start < cursor) {
      continue;
    }

    if (range.start > cursor) {
      segments.push({ text: text.slice(cursor, range.start), highlight: false });
    }

    segments.push({ text: text.slice(range.start, range.end), highlight: true, type: range.type });
    cursor = range.end;
  }

  if (cursor < text.length) {
    segments.push({ text: text.slice(cursor), highlight: false });
  }

  return segments;
};

const buildBestSegments = (answerText: string, correctedText: string, errors: AnalysisError[]): HighlightSegment[] => {
  const errorRanges = errors
    .filter((error) => typeof error.start === "number" && typeof error.end === "number")
    .map((error) => ({ start: error.start as number, end: error.end as number }))
    .filter((range) => range.start >= 0 && range.end > range.start && range.end <= answerText.length);

  const diffRanges = buildDiffRanges(answerText, correctedText);
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
};
const getSubmissionId = (): string | null => {
  if (props.id) {
    return props.id;
  }
  const param = route.params.id;
  return typeof param === "string" ? param : null;
};

const loadDetail = async (): Promise<void> => {
  const submissionId = getSubmissionId();
  if (!submissionId) {
    notifyError("No submission selected.");
    return;
  }

  loading.value = true;
  try {
    const res = await authFetch(`${baseUrl}/api/submissions/${submissionId}`);
    const payload = (await res.json()) as ApiResponse<AnswerLogRecord>;
    if (!res.ok || !payload.success || !payload.data) {
      throw new Error(payload.message || "Failed to load submission");
    }
    log.value = payload.data;
    await loadSavedWordsForLog();
  } catch (error) {
    notifyError(error instanceof Error ? error.message : "Could not load submission");
  } finally {
    loading.value = false;
  }
};

const loadSavedWordsForLog = async (): Promise<void> => {
  if (!log.value) {
    savedWordKeys.value = new Set();
    return;
  }

  try {
    const query = new URLSearchParams({ sourceAnswerLogId: String(log.value.id) }).toString();
    const res = await authFetch(`${baseUrl}/api/vocabulary?${query}`);
    const payload = (await res.json()) as ApiResponse<VocabularyItemRecord[]>;
    if (!res.ok || !payload.success || !payload.data) {
      throw new Error(payload.message || "Could not load saved vocabulary");
    }
    savedWordKeys.value = new Set(payload.data.map((item) => `${item.word}|${item.description}`));
  } catch {
    savedWordKeys.value = new Set();
  }
};

const buildWordKey = (item: ContextualWordSuggestion): string => `${item.word}|${item.description}`;

const inferVocabularyCategory = (word: string, topicName?: string): string => {
  if (/\(perfekt:/i.test(word)) {
    return "General";
  }
  return topicName?.trim() || "General";
};

const saveWordToVocabulary = async (item: ContextualWordSuggestion): Promise<void> => {
  if (!log.value) {
    return;
  }

  const key = buildWordKey(item);
  if (savedWordKeys.value.has(key)) {
    return;
  }

  savingWordKey.value = key;
  try {
    const res = await authFetch(`${baseUrl}/api/vocabulary`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        word: item.word,
        description: item.description,
        examples: item.examples,
        category: inferVocabularyCategory(item.word, log.value.topicName),
        sourceAnswerLogId: log.value.id,
        sourceQuestionId: log.value.questionId ?? undefined
      })
    });
    const payload = (await res.json()) as ApiResponse<SavedVocabularyPayload>;
    if (!res.ok || !payload.success || !payload.data) {
      throw new Error(payload.message || "Could not save vocabulary");
    }

    savedWordKeys.value = new Set([...savedWordKeys.value, key]);
    notifySuccess(
      payload.data.created
        ? `Saved "${item.word}" to ${payload.data.entry.category}.`
        : `"${item.word}" already exists in ${payload.data.entry.category}.`
    );
  } catch (error) {
    notifyError(error instanceof Error ? error.message : "Could not save word");
  } finally {
    savingWordKey.value = null;
  }
};

const formatDate = (value: string): string => new Date(value).toLocaleString();

onMounted(() => {
  void loadDetail();
});

watch(
  () => route.params.id,
  () => {
    void loadDetail();
  }
);
</script>

<template>
  <section class="space-y-4">
    <div class="flex flex-wrap items-center justify-between gap-3">
      <button
        class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
        @click="router.push('/daily-talk')"
      >
        Back to Daily Talk
      </button>
      <button
        class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
        :disabled="loading"
        @click="loadDetail"
      >
        {{ loading ? "Refreshing..." : "Refresh" }}
      </button>
    </div>

    <p v-if="notice" class="rounded-lg border px-3 py-2 text-sm"
      :class="notice.type === 'error'
        ? 'border-[color-mix(in srgb, var(--status-bad) 50%, var(--line))] bg-[color-mix(in srgb, var(--status-bad) 14%, var(--panel))]'
        : 'border-[color-mix(in srgb, var(--status-good) 50%, var(--line))] bg-[color-mix(in srgb, var(--status-good) 14%, var(--panel))]'
      "
    >
      {{ notice.text }}
    </p>

    <div v-if="!log" class="rounded-xl border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
      Select a submission to see details.
    </div>

    <div v-else class="space-y-4">
      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Question</p>
        <p class="mt-2 text-base">{{ log.questionText }}</p>
        <p class="mt-2 text-xs text-[var(--muted)]">{{ formatDate(log.createdAt) }}</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Your Answer</p>
        <p class="mt-2 whitespace-pre-wrap text-sm">
          <template v-for="(segment, idx) in buildBestSegments(log.answerText, log.correctedText, log.errorTypes)" :key="`seg-${idx}`">
            <span
              v-if="segment.highlight"
              class="rounded bg-[color-mix(in_srgb,var(--accent)_20%,transparent)] px-0.5"
              :title="segment.type ? `Error: ${segment.type}` : 'Error'"
            >
              {{ segment.text }}
            </span>
            <span v-else>{{ segment.text }}</span>
          </template>
        </p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Corrected Text</p>
        <p class="mt-2 whitespace-pre-wrap text-sm">{{ log.correctedText || "No correction returned." }}</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Mistakes</p>
        <ul v-if="log.errorTypes.length" class="mt-3 space-y-2">
          <li v-for="(error, idx) in log.errorTypes" :key="`detail-error-${idx}`" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2">
            <p class="text-sm font-medium">{{ error.message }}</p>
            <p v-if="error.description" class="text-xs text-[var(--muted)]">Explanation: {{ error.description }}</p>
            <p v-if="error.evidence" class="mt-1 text-xs">From your text: "{{ error.evidence }}"</p>
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-[var(--muted)]">No mistakes detected.</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Tips</p>
        <ul v-if="log.tips.length" class="mt-3 space-y-2">
          <li v-for="(tip, idx) in log.tips" :key="`detail-tip-${idx}`" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2">
            <p class="text-sm">{{ tip }}</p>
          </li>
        </ul>
        <p v-else class="mt-2 text-sm text-[var(--muted)]">No tips returned.</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Contextual Word Suggestions</p>
        <div v-if="log.contextualWordSuggestions.length" class="mt-3 grid gap-3 md:grid-cols-2">
          <div v-for="(item, idx) in log.contextualWordSuggestions" :key="`detail-word-${idx}`" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2">
            <div class="flex items-center justify-between gap-3">
              <p class="text-sm font-semibold">{{ item.word }}</p>
              <button
                class="rounded-md border border-[color-mix(in_srgb,var(--accent)_48%,var(--line))] bg-[linear-gradient(135deg,color-mix(in_srgb,var(--accent)_34%,var(--panel-soft))_0%,color-mix(in_srgb,var(--accent-strong)_30%,var(--panel-soft))_100%)] px-2.5 py-1 text-xs font-semibold text-[var(--text)] shadow-[0_4px_18px_color-mix(in_srgb,var(--accent)_20%,transparent)] transition hover:-translate-y-0.5 hover:shadow-[0_8px_24px_color-mix(in_srgb,var(--accent)_30%,transparent)] disabled:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                :disabled="savingWordKey === buildWordKey(item) || savedWordKeys.has(buildWordKey(item))"
                @click="saveWordToVocabulary(item)"
              >
                {{
                  savedWordKeys.has(buildWordKey(item))
                    ? "Saved"
                    : savingWordKey === buildWordKey(item)
                      ? "Saving..."
                      : "New?"
                }}
              </button>
            </div>
            <p class="text-sm text-[var(--muted)]">{{ item.description }}</p>
            <div class="text-xs text-[var(--muted)]" v-if="item.examples.length">
              <p v-for="(example, exIdx) in item.examples" :key="`detail-example-${idx}-${exIdx}`">Example: {{ example }}</p>
            </div>
          </div>
        </div>
        <p v-else class="mt-2 text-sm text-[var(--muted)]">No extra suggestions returned.</p>
      </article>

      <div class="grid gap-3 md:grid-cols-2">
        <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">CEFR</p>
          <p class="mt-2 text-2xl font-semibold">{{ log.cefrLevel }}</p>
        </article>
        <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
          <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Model Used</p>
          <p class="mt-2 text-lg font-semibold">{{ log.modelUsed }}</p>
        </article>
      </div>
    </div>
  </section>
</template>
