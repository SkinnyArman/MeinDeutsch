<script setup lang="ts">
import { inject, onMounted, reactive, ref } from "vue";
import { authFetch } from "../utils/auth";

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

const props = defineProps<{
  baseUrl?: string;
}>();

const injectedBaseUrl = inject<import("vue").Ref<string>>("baseUrl");
const resolvedBaseUrl = props.baseUrl ?? injectedBaseUrl?.value ?? "http://localhost:4000";

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
    const res = await authFetch(`${resolvedBaseUrl}/api/topics`);
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
    const res = await authFetch(`${resolvedBaseUrl}/api/topics`, {
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
    const res = await authFetch(`${resolvedBaseUrl}/api/topics/${topicId}`, {
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
  <section class="grid gap-4 xl:grid-cols-[360px_1fr]">
    <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <h2 class="mb-3 text-lg font-medium">Create Topic</h2>
      <div class="space-y-3">
        <input
          v-model="form.topicName"
          type="text"
          placeholder="Nature"
          class="w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
        <textarea
          v-model="form.topicDescription"
          rows="4"
          placeholder="German conversations about nature and climate"
          class="w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
        />
      </div>
      <button
        class="mt-4 w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-contrast)] transition disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="creating"
        @click="createTopic"
      >
        {{ creating ? "Creating..." : "Add Topic" }}
      </button>

      <p class="mt-3 text-xs text-[var(--muted)]">Topics are the only source for AI question generation.</p>
    </article>

    <article class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-lg font-medium">Topics</h2>
        <div class="flex items-center gap-2">
          <span class="rounded px-2 py-1 text-xs text-[var(--accent)] bg-[color-mix(in srgb, var(--accent) 16%, var(--panel-soft))] border border-[color-mix(in srgb, var(--accent) 35%, var(--line))]">
            {{ topics.length }} total
          </span>
          <button
            class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-1 text-sm font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
            :disabled="isLoading"
            @click="loadTopics"
          >
            {{ isLoading ? "Refreshing..." : "Refresh" }}
          </button>
        </div>
      </div>

      <p
        v-if="notice"
        class="mb-3 rounded-lg border px-3 py-2 text-sm"
        :class="notice.type === 'error'
          ? 'border-[color-mix(in srgb, var(--status-bad) 50%, var(--line))] bg-[color-mix(in srgb, var(--status-bad) 14%, var(--panel))]'
          : 'border-[color-mix(in srgb, var(--status-good) 50%, var(--line))] bg-[color-mix(in srgb, var(--status-good) 14%, var(--panel))]'
        "
      >
        {{ notice.text }}
      </p>

      <div v-if="!topics.length && !isLoading" class="rounded-md border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
        No topics yet.
      </div>

      <ul v-else class="space-y-3">
        <li v-for="topic in topics" :key="topic.id" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-3">
          <div class="flex items-start justify-between gap-3">
            <div>
              <p class="font-medium">{{ topic.name }}</p>
              <p v-if="topic.description" class="mt-1 text-sm text-[var(--muted)]">{{ topic.description }}</p>
              <p class="mt-2 text-xs text-[var(--muted)]">ID: {{ topic.id }}</p>
            </div>

            <button
              class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-1 text-xs font-medium text-[var(--text)] transition hover:border-[var(--accent)]"
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
