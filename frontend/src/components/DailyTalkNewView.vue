<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref } from "vue";

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

interface TopicRecord {
  id: number;
  name: string;
  description: string | null;
}

interface QuestionRecord {
  id: number;
  topicId: number;
  questionText: string;
  cefrTarget: string | null;
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

type Notice = {
  type: "success" | "error";
  text: string;
};

const baseUrl = inject<import("vue").Ref<string>>("baseUrl")?.value ?? "http://localhost:4000";

const topics = ref<TopicRecord[]>([]);
const selectedTopicId = ref<string>("");
const selectedCefrTarget = ref<string>("");
const generatedQuestion = ref<QuestionRecord | null>(null);
const result = ref<AnswerLogRecord | null>(null);
const notice = ref<Notice | null>(null);

const loadingTopics = ref(false);
const generatingQuestion = ref(false);
const submittingAnswer = ref(false);

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

const notifyError = (text: string): void => {
  notice.value = { type: "error", text };
};

const notifySuccess = (text: string): void => {
  notice.value = { type: "success", text };
};

const parseApiResponse = async <T>(res: Response): Promise<ApiResponse<T>> => {
  const payload = (await res.json()) as ApiResponse<T>;

  if (!res.ok || !payload.success || !payload.data) {
    throw new Error(payload.message || "Request failed");
  }

  return payload;
};

const loadTopics = async (): Promise<void> => {
  loadingTopics.value = true;
  try {
    const res = await fetch(`${baseUrl}/api/topics`);
    const payload = await parseApiResponse<TopicRecord[]>(res);
    topics.value = payload.data;

    if (!selectedTopicId.value && topics.value.length > 0) {
      selectedTopicId.value = String(topics.value[0].id);
    }
  } catch (error) {
    notifyError(error instanceof Error ? error.message : "Could not load topics");
  } finally {
    loadingTopics.value = false;
  }
};

const generateQuestion = async (): Promise<void> => {
  if (!selectedTopicId.value) {
    notifyError("Choose a topic first");
    return;
  }

  generatingQuestion.value = true;
  result.value = null;
  notice.value = null;

  try {
    const resolvedTopicId =
      selectedTopicId.value === "random"
        ? topics.value[Math.floor(Math.random() * topics.value.length)]?.id
        : Number(selectedTopicId.value);

    if (!resolvedTopicId) {
      notifyError("No topics available to choose from");
      return;
    }

    const res = await fetch(`${baseUrl}/api/questions/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicId: resolvedTopicId,
        cefrTarget: selectedCefrTarget.value || undefined
      })
    });

    const payload = await parseApiResponse<QuestionRecord>(res);
    generatedQuestion.value = payload.data;
    form.answerText = "";
    notifySuccess("Question generated. Answer it and submit for correction.");
  } catch (error) {
    generatedQuestion.value = null;
    notifyError(error instanceof Error ? error.message : "Could not generate question");
  } finally {
    generatingQuestion.value = false;
  }
};

const submitAnswer = async (): Promise<void> => {
  if (!generatedQuestion.value) {
    notifyError("Generate a question first");
    return;
  }

  if (!form.answerText.trim()) {
    notifyError("Write your answer before submitting");
    return;
  }

  submittingAnswer.value = true;
  notice.value = null;

  try {
    const res = await fetch(`${baseUrl}/api/submissions/text`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        questionId: generatedQuestion.value.id,
        answerText: form.answerText.trim()
      })
    });

    const payload = await parseApiResponse<AnswerLogRecord>(res);
    result.value = payload.data;
    notifySuccess("Answer analyzed and stored in your knowledge base.");
  } catch (error) {
    notifyError(error instanceof Error ? error.message : "Could not submit answer");
  } finally {
    submittingAnswer.value = false;
  }
};

onMounted(() => {
  void loadTopics();
});
</script>

<template>
  <section class="space-y-4">
    <header class="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--surface-shadow)]">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_10%_10%,color-mix(in_srgb,var(--accent)_20%,transparent)_0%,transparent_45%)] opacity-60"></div>
      <div class="relative">
        <h2 class="text-2xl font-semibold tracking-tight">New Daily Talk</h2>
        <p class="mt-1 text-sm text-[var(--muted)]">Generate a new question and submit your answer.</p>
      </div>
    </header>

    <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-lg font-semibold">Daily Talk Setup</h3>
        <button
          class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-1 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
          :disabled="loadingTopics"
          @click="loadTopics"
        >
          {{ loadingTopics ? "Loading..." : "Refresh topics" }}
        </button>
      </div>

      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label class="mb-2 block text-sm text-[var(--muted)]">Topic</label>
          <select v-model="selectedTopicId" class="w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]">
            <option value="">Choose topic</option>
            <option value="random">Random topic</option>
            <option v-for="topic in topics" :key="topic.id" :value="String(topic.id)">
              {{ topic.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-2 block text-sm text-[var(--muted)]">CEFR Target (optional)</label>
          <select v-model="selectedCefrTarget" class="w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]">
            <option value="">Auto</option>
            <option value="A1">A1</option>
            <option value="A2">A2</option>
            <option value="B1">B1</option>
            <option value="B2">B2</option>
            <option value="C1">C1</option>
            <option value="C2">C2</option>
          </select>
        </div>
      </div>

      <button
        class="mt-4 w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-contrast)] transition disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="generatingQuestion || !selectedTopicId"
        @click="generateQuestion"
      >
        {{ generatingQuestion ? "Generating question..." : "Generate Daily Talk question" }}
      </button>
    </article>

    <article v-if="generatedQuestion" class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-5 shadow-[var(--surface-shadow)]">
      <p class="inline-flex rounded-full border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_12%,var(--panel-soft))] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
        Today's question
      </p>
      <p class="mt-3 text-lg leading-relaxed">{{ generatedQuestion.questionText }}</p>
      <p class="mt-3 text-xs text-[var(--muted)]">
        Topic ID {{ generatedQuestion.topicId }}
        <span v-if="generatedQuestion.cefrTarget"> · Target {{ generatedQuestion.cefrTarget }}</span>
      </p>
    </article>

    <article v-if="generatedQuestion" class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <div class="mb-2 flex items-center justify-between gap-3">
        <h3 class="text-lg font-semibold">Your Answer</h3>
        <span class="rounded px-2 py-1 text-xs text-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_16%,var(--panel-soft))] border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))]">
          {{ answerWordCount }} words
        </span>
      </div>
      <p class="mb-3 text-sm text-[var(--muted)]">Keep it concise and natural.</p>
      <textarea
        v-model="form.answerText"
        rows="6"
        class="w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        placeholder="Write your German answer here..."
      />
      <button
        class="mt-4 w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-contrast)] transition disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="submittingAnswer"
        @click="submitAnswer"
      >
        {{ submittingAnswer ? "Submitting..." : "Submit answer" }}
      </button>
    </article>

    <p
      v-if="notice"
      class="rounded-lg border px-3 py-2 text-sm"
      :class="notice.type === 'error'
        ? 'border-[color-mix(in_srgb,var(--status-bad)_50%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_14%,var(--panel))]'
        : 'border-[color-mix(in_srgb,var(--status-good)_50%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))]'
      "
    >
      {{ notice.text }}
    </p>

    <article v-if="result" class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Your Answer With Highlights</p>
      <p class="mt-3 whitespace-pre-wrap text-sm">
        <template v-for="(segment, idx) in highlightedAnswerSegments" :key="`seg-${idx}`">
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

    <section v-if="result" class="grid gap-4 md:grid-cols-2">
      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">CEFR Level</p>
        <p class="mt-3 text-3xl font-semibold">{{ result.cefrLevel }}</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Model Used</p>
        <p class="mt-3 text-lg font-semibold">{{ result.modelUsed }}</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)] md:col-span-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Fully Corrected Text</p>
        <p class="mt-3 whitespace-pre-wrap text-base leading-relaxed">{{ result.correctedText || "No correction returned." }}</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Mistakes</p>
        <ul class="mt-3 space-y-2" v-if="result.errorTypes.length">
          <li v-for="(error, idx) in result.errorTypes" :key="`${error.type}-${idx}`" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2">
            <p class="text-sm font-medium">{{ error.message }}</p>
            <p v-if="error.description" class="text-xs text-[var(--muted)]">Explanation: {{ error.description }}</p>
            <p v-if="error.evidence" class="mt-1 text-xs">From your text: "{{ error.evidence }}"</p>
          </li>
        </ul>
        <p class="mt-3 text-sm text-[var(--muted)]" v-else>No mistakes detected.</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Tips</p>
        <ul class="mt-3 space-y-2" v-if="result.tips.length">
          <li v-for="(tip, idx) in result.tips" :key="`tip-${idx}`" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2">
            <p class="text-sm">{{ tip }}</p>
          </li>
        </ul>
        <p class="mt-3 text-sm text-[var(--muted)]" v-else>No tips returned.</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)] md:col-span-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Contextual Word Suggestions</p>
        <div v-if="result.contextualWordSuggestions.length" class="mt-3 grid gap-3 md:grid-cols-2">
          <div v-for="(item, idx) in result.contextualWordSuggestions" :key="`word-${idx}`" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2">
            <p class="text-sm font-semibold">{{ item.word }}</p>
            <p class="text-sm text-[var(--muted)]">{{ item.description }}</p>
            <div class="text-xs text-[var(--muted)]" v-if="item.examples.length">
              <p v-for="(example, exIdx) in item.examples" :key="`example-${idx}-${exIdx}`">Example: {{ example }}</p>
            </div>
          </div>
        </div>
        <p v-else class="mt-3 text-sm text-[var(--muted)]">No extra suggestions returned.</p>
      </article>
    </section>
  </section>
</template>
