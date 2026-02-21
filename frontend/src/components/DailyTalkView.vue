<script setup lang="ts">
import { computed, inject, onMounted, reactive, ref } from "vue";
import { useRouter } from "vue-router";

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
  createdAt: string;
}

type Notice = {
  type: "success" | "error";
  text: string;
};

const baseUrl = inject<import("vue").Ref<string>>("baseUrl")?.value ?? "http://localhost:4000";
const router = useRouter();

const topics = ref<TopicRecord[]>([]);
const selectedTopicId = ref<string>("");
const selectedCefrTarget = ref<string>("");
const generatedQuestion = ref<QuestionRecord | null>(null);
const result = ref<AnswerLogRecord | null>(null);
const notice = ref<Notice | null>(null);

const loadingTopics = ref(false);
const generatingQuestion = ref(false);
const submittingAnswer = ref(false);
const loadingHistory = ref(false);
const historyNotice = ref<Notice | null>(null);
const history = ref<AnswerLogRecord[]>([]);

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

const notifyError = (text: string): void => {
  notice.value = { type: "error", text };
};

const notifySuccess = (text: string): void => {
  notice.value = { type: "success", text };
};

const setHistoryNotice = (type: "success" | "error", text: string): void => {
  historyNotice.value = { type, text };
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

const loadHistory = async (): Promise<void> => {
  loadingHistory.value = true;
  try {
    const res = await fetch(`${baseUrl}/api/submissions?limit=50`);
    const payload = await parseApiResponse<AnswerLogRecord[]>(res);
    history.value = payload.data;
    setHistoryNotice("success", `Loaded ${payload.data.length} submissions.`);
  } catch (error) {
    setHistoryNotice("error", error instanceof Error ? error.message : "Could not load submissions");
  } finally {
    loadingHistory.value = false;
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
    void loadHistory();
  } catch (error) {
    notifyError(error instanceof Error ? error.message : "Could not submit answer");
  } finally {
    submittingAnswer.value = false;
  }
};

const formatDate = (value: string): string => new Date(value).toLocaleString();

onMounted(() => {
  void loadTopics();
  void loadHistory();
});
</script>

<template>
  <section class="space-y-4">
    <header class="mb-2">
      <h2 class="text-2xl font-semibold tracking-tight">Daily Talk</h2>
      <p class="mt-1 text-sm text-[var(--muted)]">Generate a question, answer it, and review your progress.</p>
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
      <p class="inline-flex rounded-full border border-[color-mix(in srgb, var(--accent) 35%, var(--line))] bg-[color-mix(in srgb, var(--accent) 12%, var(--panel-soft))] px-3 py-1 text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">
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
        <span class="rounded px-2 py-1 text-xs text-[var(--accent)] bg-[color-mix(in srgb, var(--accent) 16%, var(--panel-soft))] border border-[color-mix(in srgb, var(--accent) 35%, var(--line))]">
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
        ? 'border-[color-mix(in srgb, var(--status-bad) 50%, var(--line))] bg-[color-mix(in srgb, var(--status-bad) 14%, var(--panel))]'
        : 'border-[color-mix(in srgb, var(--status-good) 50%, var(--line))] bg-[color-mix(in srgb, var(--status-good) 14%, var(--panel))]'
      "
    >
      {{ notice.text }}
    </p>

    <section v-if="result" class="grid gap-4 md:grid-cols-2">
      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">CEFR Level</p>
        <p class="mt-3 text-3xl font-semibold">{{ result.cefrLevel }}</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)] md:col-span-2">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Fully Corrected Text</p>
        <p class="mt-3 whitespace-pre-wrap text-base leading-relaxed">{{ result.correctedText || "No correction returned." }}</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Mistakes</p>
        <ul class="mt-3 space-y-2" v-if="result.errorTypes.length">
          <li v-for="(error, idx) in result.errorTypes" :key="`${error.type}-${idx}`" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2">
            <p class="text-sm font-medium">{{ error.type }}</p>
            <p class="text-sm text-[var(--muted)]">{{ error.message }}</p>
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

    <section class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 class="text-lg font-semibold">Past Daily Talks</h3>
          <p class="text-xs text-[var(--muted)]">Click a question to open the full detail page.</p>
        </div>
        <button
          class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-1 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
          :disabled="loadingHistory"
          @click="loadHistory"
        >
          {{ loadingHistory ? "Refreshing..." : "Refresh" }}
        </button>
      </div>

      <p v-if="historyNotice" class="mb-3 rounded-lg border px-3 py-2 text-sm"
        :class="historyNotice.type === 'error'
          ? 'border-[color-mix(in srgb, var(--status-bad) 50%, var(--line))] bg-[color-mix(in srgb, var(--status-bad) 14%, var(--panel))]'
          : 'border-[color-mix(in srgb, var(--status-good) 50%, var(--line))] bg-[color-mix(in srgb, var(--status-good) 14%, var(--panel))]'
        "
      >
        {{ historyNotice.text }}
      </p>

      <div v-if="!history.length && !loadingHistory" class="rounded-md border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
        No Daily Talk submissions yet.
      </div>

      <ul v-else class="space-y-3">
        <li
          v-for="item in history"
          :key="item.id"
          class="cursor-pointer rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-3 transition hover:border-[var(--accent)]"
          @click="router.push(`/daily-talk/${item.id}`)"
        >
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="text-sm font-semibold">{{ item.questionText }}</p>
              <p class="mt-1 text-xs text-[var(--muted)]">{{ formatDate(item.createdAt) }}</p>
              <p class="mt-1 text-xs text-[var(--muted)]">{{ item.topicName ?? "General" }} · CEFR {{ item.cefrLevel }}</p>
            </div>
            <span class="rounded border border-[color-mix(in srgb, var(--accent) 35%, var(--line))] bg-[color-mix(in srgb, var(--accent) 16%, var(--panel-soft))] px-2 py-1 text-xs text-[var(--accent)]">
              #{{ item.id }}
            </span>
          </div>
        </li>
      </ul>
    </section>
  </section>
</template>
