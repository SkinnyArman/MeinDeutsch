<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface KnowledgeItemRecord {
  id: number;
  topicId: number | null;
  topicName?: string;
  questionId: number | null;
  answerLogId: number | null;
  itemType: string;
  textChunk: string;
  metadata: Record<string, unknown>;
  createdAt: string;
}

interface TopicRecord {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

type FilterState = {
  topicId: string;
  limit: string;
};

const baseUrl = ref("http://localhost:4000");
const loading = ref(false);
const loadingTopics = ref(false);
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);
const items = ref<KnowledgeItemRecord[]>([]);
const topics = ref<TopicRecord[]>([]);

const filters = reactive<FilterState>({
  topicId: "",
  limit: "30"
});

const setError = (text: string): void => {
  notice.value = { type: "error", text };
};

const setSuccess = (text: string): void => {
  notice.value = { type: "success", text };
};

const buildQuery = (): string => {
  const params = new URLSearchParams();
  if (filters.topicId.trim()) {
    params.set("topicId", filters.topicId.trim());
  }
  if (filters.limit.trim()) {
    params.set("limit", filters.limit.trim());
  }

  const q = params.toString();
  return q ? `?${q}` : "";
};

const loadKnowledge = async (): Promise<void> => {
  loading.value = true;
  try {
    const res = await fetch(`${baseUrl.value}/api/knowledge${buildQuery()}`);
    const payload = (await res.json()) as ApiResponse<KnowledgeItemRecord[]>;

    if (!res.ok || !payload.success) {
      throw new Error(payload.message || "Failed to load knowledge entries");
    }

    items.value = payload.data;
    setSuccess(`Loaded ${payload.data.length} knowledge item(s)`);
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not load knowledge entries");
  } finally {
    loading.value = false;
  }
};

const loadTopics = async (): Promise<void> => {
  loadingTopics.value = true;
  try {
    const res = await fetch(`${baseUrl.value}/api/topics`);
    const payload = (await res.json()) as ApiResponse<TopicRecord[]>;

    if (!res.ok || !payload.success) {
      throw new Error(payload.message || "Failed to load topics");
    }

    topics.value = payload.data;
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not load topics");
  } finally {
    loadingTopics.value = false;
  }
};

onMounted(() => {
  void loadTopics();
  void loadKnowledge();
});
</script>

<template>
  <section class="surface mb-6 p-4">
    <div class="mb-2 flex items-center justify-between gap-3">
      <label class="block text-sm muted">API Base URL</label>
      <div class="flex gap-2">
        <button class="btn-secondary !w-auto px-3 py-1" :disabled="loadingTopics" @click="loadTopics">
          {{ loadingTopics ? "Loading Topics..." : "Refresh Topics" }}
        </button>
        <button class="btn-secondary !w-auto px-3 py-1" :disabled="loading" @click="loadKnowledge">
          {{ loading ? "Loading KB..." : "Refresh KB" }}
        </button>
      </div>
    </div>
    <input v-model="baseUrl" class="input-field" type="text" />
  </section>

  <section class="surface mb-6 p-4">
    <h2 class="mb-3 text-lg font-medium">Filters</h2>
    <div class="grid gap-3 md:grid-cols-2">
      <select v-model="filters.topicId" class="input-field">
        <option value="">All topics</option>
        <option v-for="topic in topics" :key="topic.id" :value="String(topic.id)">
          {{ topic.name }} (ID {{ topic.id }})
        </option>
      </select>
      <input v-model="filters.limit" class="input-field" type="number" placeholder="Limit (default 30)" />
    </div>
    <button class="btn-primary mt-4" :disabled="loading" @click="loadKnowledge">
      {{ loading ? "Loading..." : "Apply Filters" }}
    </button>
  </section>

  <section class="surface p-4">
    <div class="mb-3 flex items-center justify-between gap-3">
      <h2 class="text-lg font-medium">Knowledge Items</h2>
      <span class="method-badge">{{ items.length }} loaded</span>
    </div>

    <p v-if="notice" class="mb-3 text-sm" :class="notice.type === 'error' ? 'text-rose-400' : 'text-emerald-400'">
      {{ notice.text }}
    </p>

    <div v-if="!items.length && !loading" class="rounded-md border border-dashed border-[var(--line)] p-4 text-sm muted">
      No knowledge entries found.
    </div>

    <ul v-else class="space-y-3">
      <li v-for="item in items" :key="item.id" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-3">
        <div class="mb-2 flex items-center justify-between gap-3">
          <p class="text-sm font-semibold">KB #{{ item.id }} · {{ item.itemType }}</p>
          <p class="text-xs muted">{{ new Date(item.createdAt).toLocaleString() }}</p>
        </div>

        <p class="mb-2 text-xs muted">
          Topic: {{ item.topicName ?? "General" }}
          <span v-if="item.topicId">(ID {{ item.topicId }})</span>
          · Question ID: {{ item.questionId ?? "-" }}
          · Answer Log ID: {{ item.answerLogId ?? "-" }}
        </p>

        <pre class="response-pre whitespace-pre-wrap">{{ item.textChunk }}</pre>
      </li>
    </ul>
  </section>
</template>
