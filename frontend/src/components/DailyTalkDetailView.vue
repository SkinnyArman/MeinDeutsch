<script setup lang="ts">
import { inject, onMounted, ref, watch } from "vue";
import { useRoute, useRouter } from "vue-router";

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

const props = defineProps<{
  id?: string;
}>();

const baseUrl = inject<import("vue").Ref<string>>("baseUrl")?.value ?? "http://localhost:4000";
const route = useRoute();
const router = useRouter();

const loading = ref(false);
const log = ref<AnswerLogRecord | null>(null);
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);

const notifyError = (text: string): void => {
  notice.value = { type: "error", text };
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
    const res = await fetch(`${baseUrl}/api/submissions/${submissionId}`);
    const payload = (await res.json()) as ApiResponse<AnswerLogRecord>;
    if (!res.ok || !payload.success || !payload.data) {
      throw new Error(payload.message || "Failed to load submission");
    }
    log.value = payload.data;
  } catch (error) {
    notifyError(error instanceof Error ? error.message : "Could not load submission");
  } finally {
    loading.value = false;
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
        <p class="mt-2 whitespace-pre-wrap text-sm">{{ log.answerText }}</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Corrected Text</p>
        <p class="mt-2 whitespace-pre-wrap text-sm">{{ log.correctedText || "No correction returned." }}</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">CEFR</p>
        <p class="mt-2 text-2xl font-semibold">{{ log.cefrLevel }}</p>
      </article>

      <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <p class="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Mistakes</p>
        <ul v-if="log.errorTypes.length" class="mt-3 space-y-2">
          <li v-for="(error, idx) in log.errorTypes" :key="`detail-error-${idx}`" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2">
            <p class="text-sm font-medium">{{ error.type }}</p>
            <p class="text-sm text-[var(--muted)]">{{ error.message }}</p>
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
            <p class="text-sm font-semibold">{{ item.word }}</p>
            <p class="text-sm text-[var(--muted)]">{{ item.description }}</p>
            <div class="text-xs text-[var(--muted)]" v-if="item.examples.length">
              <p v-for="(example, exIdx) in item.examples" :key="`detail-example-${idx}-${exIdx}`">Example: {{ example }}</p>
            </div>
          </div>
        </div>
        <p v-else class="mt-2 text-sm text-[var(--muted)]">No extra suggestions returned.</p>
      </article>
    </div>
  </section>
</template>
