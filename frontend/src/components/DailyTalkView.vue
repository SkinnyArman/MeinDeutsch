<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";

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
  severity: number;
}

interface AnswerLogRecord {
  id: number;
  questionId: number | null;
  questionText: string;
  answerText: string;
  correctedText: string;
  cefrLevel: string;
  errorTypes: AnalysisError[];
  tips: string[];
  contextualWordSuggestions: string[];
  createdAt: string;
}

type Notice = {
  type: "success" | "error";
  text: string;
};

const baseUrl = ref("http://localhost:4000");
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
    const res = await fetch(`${baseUrl.value}/api/topics`);
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
    const res = await fetch(`${baseUrl.value}/api/questions/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        topicId: Number(selectedTopicId.value),
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
    const res = await fetch(`${baseUrl.value}/api/submissions/text`, {
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
  <section class="daily-layout">
    <article class="surface p-4">
      <div class="mb-3 flex flex-wrap items-center justify-between gap-3">
        <h3 class="text-lg font-semibold">Daily Talk Setup</h3>
        <button class="btn-secondary !w-auto px-3 py-1" :disabled="loadingTopics" @click="loadTopics">
          {{ loadingTopics ? "Loading..." : "Refresh topics" }}
        </button>
      </div>

      <label class="mb-2 block text-sm muted">API Base URL</label>
      <input v-model="baseUrl" class="input-field mb-4" type="text" />

      <div class="grid gap-3 md:grid-cols-2">
        <div>
          <label class="mb-2 block text-sm muted">Topic</label>
          <select v-model="selectedTopicId" class="input-field">
            <option value="">Choose topic</option>
            <option v-for="topic in topics" :key="topic.id" :value="String(topic.id)">
              {{ topic.name }}
            </option>
          </select>
        </div>

        <div>
          <label class="mb-2 block text-sm muted">CEFR Target (optional)</label>
          <select v-model="selectedCefrTarget" class="input-field">
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

      <button class="btn-primary mt-4" :disabled="generatingQuestion || !selectedTopicId" @click="generateQuestion">
        {{ generatingQuestion ? "Generating question..." : "Generate Daily Talk question" }}
      </button>
    </article>

    <article class="surface p-5" v-if="generatedQuestion">
      <p class="daily-badge">Today's question</p>
      <p class="mt-3 text-lg leading-relaxed">{{ generatedQuestion.questionText }}</p>
      <p class="mt-3 text-xs muted">
        Topic ID {{ generatedQuestion.topicId }}
        <span v-if="generatedQuestion.cefrTarget"> · Target {{ generatedQuestion.cefrTarget }}</span>
      </p>
    </article>

    <article class="surface p-4" v-if="generatedQuestion">
      <div class="mb-2 flex items-center justify-between gap-3">
        <h3 class="text-lg font-semibold">Your Answer</h3>
        <span class="method-badge">{{ answerWordCount }} words</span>
      </div>
      <p class="mb-3 text-sm muted">Keep it concise and natural.</p>
      <textarea
        v-model="form.answerText"
        rows="6"
        class="input-field"
        placeholder="Write your German answer here..."
      />
      <button class="btn-primary mt-4" :disabled="submittingAnswer" @click="submitAnswer">
        {{ submittingAnswer ? "Submitting..." : "Submit answer" }}
      </button>
    </article>

    <p
      v-if="notice"
      class="rounded-lg border px-3 py-2 text-sm"
      :class="notice.type === 'error' ? 'notice-error' : 'notice-success'"
    >
      {{ notice.text }}
    </p>

    <section v-if="result" class="daily-results-grid">
      <article class="surface p-4">
        <p class="daily-result-title">CEFR Level</p>
        <p class="mt-3 text-3xl font-semibold">{{ result.cefrLevel }}</p>
      </article>

      <article class="surface p-4 md:col-span-2">
        <p class="daily-result-title">Fully Corrected Text</p>
        <p class="mt-3 whitespace-pre-wrap text-base leading-relaxed">{{ result.correctedText || "No correction returned." }}</p>
      </article>

      <article class="surface p-4">
        <p class="daily-result-title">Mistakes</p>
        <ul class="mt-3 space-y-2" v-if="result.errorTypes.length">
          <li v-for="(error, idx) in result.errorTypes" :key="`${error.type}-${idx}`" class="daily-list-item">
            <p class="text-sm font-medium">{{ error.type }}</p>
            <p class="text-sm muted">{{ error.message }}</p>
          </li>
        </ul>
        <p class="mt-3 text-sm muted" v-else>No mistakes detected.</p>
      </article>

      <article class="surface p-4">
        <p class="daily-result-title">Tips</p>
        <ul class="mt-3 space-y-2" v-if="result.tips.length">
          <li v-for="(tip, idx) in result.tips" :key="`tip-${idx}`" class="daily-list-item">
            <p class="text-sm">{{ tip }}</p>
          </li>
        </ul>
        <p class="mt-3 text-sm muted" v-else>No tips returned.</p>
      </article>

      <article class="surface p-4 md:col-span-2">
        <p class="daily-result-title">Contextual Word Suggestions</p>
        <div class="mt-3 flex flex-wrap gap-2" v-if="result.contextualWordSuggestions.length">
          <span v-for="(word, idx) in result.contextualWordSuggestions" :key="`word-${idx}`" class="daily-word-chip">
            {{ word }}
          </span>
        </div>
        <p class="mt-3 text-sm muted" v-else>No extra suggestions returned.</p>
      </article>
    </section>
  </section>
</template>
