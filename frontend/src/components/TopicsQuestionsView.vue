<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
}

interface TopicRecord {
  id: number;
  name: string;
  description: string | null;
  createdAt: string;
}

type FormState = {
  topicName: string;
  topicDescription: string;
};

const baseUrl = ref("http://localhost:4000");
const isLoading = ref(false);
const creating = ref(false);
const deletingTopicId = ref<number | null>(null);
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);
const topics = ref<TopicRecord[]>([]);

const form = reactive<FormState>({
  topicName: "",
  topicDescription: ""
});

const showSuccess = (text: string): void => {
  notice.value = { type: "success", text };
};

const showError = (text: string): void => {
  notice.value = { type: "error", text };
};

const loadTopics = async (): Promise<void> => {
  isLoading.value = true;
  try {
    const res = await fetch(`${baseUrl.value}/api/topics`);
    const payload = (await res.json()) as ApiResponse<TopicRecord[]>;

    if (!res.ok || !payload.success) {
      throw new Error(payload.message || "Failed to load topics");
    }

    topics.value = payload.data;
  } catch (error) {
    showError(error instanceof Error ? error.message : "Could not load topics");
  } finally {
    isLoading.value = false;
  }
};

const createTopic = async (): Promise<void> => {
  if (!form.topicName.trim()) {
    showError("Topic name is required");
    return;
  }

  creating.value = true;
  try {
    const res = await fetch(`${baseUrl.value}/api/topics`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: form.topicName,
        description: form.topicDescription || undefined
      })
    });

    const payload = (await res.json()) as ApiResponse<TopicRecord>;
    if (!res.ok || !payload.success) {
      throw new Error(payload.message || "Failed to create topic");
    }

    topics.value = [payload.data, ...topics.value];
    form.topicName = "";
    form.topicDescription = "";
    showSuccess("Topic created");
  } catch (error) {
    showError(error instanceof Error ? error.message : "Could not create topic");
  } finally {
    creating.value = false;
  }
};

const deleteTopic = async (topicId: number): Promise<void> => {
  deletingTopicId.value = topicId;
  try {
    const res = await fetch(`${baseUrl.value}/api/topics/${topicId}`, {
      method: "DELETE"
    });

    const payload = (await res.json()) as ApiResponse<null>;
    if (!res.ok || !payload.success) {
      throw new Error(payload.message || "Failed to delete topic");
    }

    topics.value = topics.value.filter((topic) => topic.id !== topicId);
    showSuccess("Topic deleted");
  } catch (error) {
    showError(error instanceof Error ? error.message : "Could not delete topic");
  } finally {
    deletingTopicId.value = null;
  }
};

onMounted(() => {
  void loadTopics();
});
</script>

<template>
  <section class="surface mb-6 p-4">
    <div class="mb-2 flex items-center justify-between gap-3">
      <label class="block text-sm muted">API Base URL</label>
      <button class="btn-secondary !w-auto px-3 py-1" :disabled="isLoading" @click="loadTopics">
        {{ isLoading ? "Refreshing..." : "Refresh Topics" }}
      </button>
    </div>
    <input v-model="baseUrl" class="input-field" type="text" />
  </section>

  <section class="grid gap-4 xl:grid-cols-[360px_1fr]">
    <article class="surface p-4">
      <h2 class="mb-3 text-lg font-medium">Create Topic</h2>
      <div class="space-y-3">
        <input v-model="form.topicName" type="text" placeholder="Nature" class="input-field" />
        <textarea
          v-model="form.topicDescription"
          rows="4"
          placeholder="German conversations about nature and climate"
          class="input-field"
        />
      </div>
      <button class="btn-primary mt-4" :disabled="creating" @click="createTopic">
        {{ creating ? "Creating..." : "Add Topic" }}
      </button>

      <p class="mt-3 text-xs muted">Topics are the only source for AI question generation.</p>
    </article>

    <article class="surface p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-lg font-medium">Topics</h2>
        <span class="method-badge">{{ topics.length }} total</span>
      </div>

      <p v-if="notice" class="mb-3 rounded-lg border px-3 py-2 text-sm" :class="notice.type === 'error' ? 'notice-error' : 'notice-success'">
        {{ notice.text }}
      </p>

      <div v-if="!topics.length && !isLoading" class="rounded-md border border-dashed border-[var(--line)] p-4 text-sm muted">
        No topics yet.
      </div>

      <ul v-else class="space-y-3">
        <li v-for="topic in topics" :key="topic.id" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium">{{ topic.name }}</p>
              <p v-if="topic.description" class="mt-1 text-sm muted">{{ topic.description }}</p>
              <p class="mt-2 text-xs muted">ID: {{ topic.id }}</p>
            </div>

            <button
              class="btn-secondary !w-auto px-3 py-1 text-xs"
              :disabled="deletingTopicId === topic.id"
              @click="deleteTopic(topic.id)"
            >
              {{ deletingTopicId === topic.id ? "Deleting..." : "Delete" }}
            </button>
          </div>
        </li>
      </ul>
    </article>
  </section>
</template>
