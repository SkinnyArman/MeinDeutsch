<script setup lang="ts">
import { reactive, ref } from "vue";

type FormState = {
  topicName: string;
  topicDescription: string;
  topicId: string;
  cefrTarget: string;
};

const baseUrl = ref("http://localhost:4000");
const loadingKey = ref<string | null>(null);
const statusLine = ref("-");
const responseText = ref("No request yet.");

const form = reactive<FormState>({
  topicName: "",
  topicDescription: "",
  topicId: "",
  cefrTarget: ""
});

const run = async (key: string, endpoint: string, method: "GET" | "POST", payload?: Record<string, unknown>): Promise<void> => {
  loadingKey.value = key;
  try {
    const init: RequestInit = { method };
    if (payload) {
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(payload);
    }

    const res = await fetch(`${baseUrl.value}${endpoint}`, init);
    const data = await res.json();
    statusLine.value = `${res.status} ${res.statusText}`;
    responseText.value = JSON.stringify(data, null, 2);
  } catch (error) {
    statusLine.value = "Request failed";
    responseText.value = JSON.stringify(
      {
        message: "Could not reach API.",
        details: error instanceof Error ? error.message : String(error)
      },
      null,
      2
    );
  } finally {
    loadingKey.value = null;
  }
};

const createTopic = async (): Promise<void> => {
  await run("create-topic", "/api/topics", "POST", {
    name: form.topicName,
    description: form.topicDescription || undefined
  });
};

const listTopics = async (): Promise<void> => {
  await run("list-topics", "/api/topics", "GET");
};

const generateQuestion = async (): Promise<void> => {
  await run("generate-question", "/api/questions/generate", "POST", {
    topicId: Number(form.topicId),
    cefrTarget: form.cefrTarget || undefined
  });
};

const listQuestions = async (): Promise<void> => {
  await run("list-questions", "/api/questions", "GET");
};
</script>

<template>
  <section class="mb-8 rounded-xl border border-line bg-panel p-4">
    <label class="mb-2 block text-sm text-slate-300">API Base URL</label>
    <input
      v-model="baseUrl"
      class="w-full rounded-md border border-line bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-400"
      type="text"
    />
  </section>

  <section class="grid gap-4 xl:grid-cols-2">
    <article class="rounded-xl border border-line bg-panel p-4">
      <h2 class="mb-3 text-lg font-medium">Create Topic</h2>
      <div class="space-y-3">
        <input
          v-model="form.topicName"
          type="text"
          placeholder="Nature"
          class="w-full rounded-md border border-line bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
        <textarea
          v-model="form.topicDescription"
          rows="4"
          placeholder="German conversations about nature and climate"
          class="w-full rounded-md border border-line bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </div>
      <button
        class="mt-4 w-full rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
        :disabled="loadingKey === 'create-topic'"
        @click="createTopic"
      >
        {{ loadingKey === "create-topic" ? "Running..." : "POST /api/topics" }}
      </button>
      <button
        class="mt-2 w-full rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 disabled:opacity-50"
        :disabled="loadingKey === 'list-topics'"
        @click="listTopics"
      >
        {{ loadingKey === "list-topics" ? "Running..." : "GET /api/topics" }}
      </button>
    </article>

    <article class="rounded-xl border border-line bg-panel p-4">
      <h2 class="mb-3 text-lg font-medium">Generate Question</h2>
      <div class="space-y-3">
        <input
          v-model="form.topicId"
          type="number"
          placeholder="Topic ID"
          class="w-full rounded-md border border-line bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
        <input
          v-model="form.cefrTarget"
          type="text"
          placeholder="Optional CEFR target (B1)"
          class="w-full rounded-md border border-line bg-slate-900 px-3 py-2 text-sm outline-none focus:border-cyan-400"
        />
      </div>
      <button
        class="mt-4 w-full rounded-md bg-cyan-500 px-3 py-2 text-sm font-medium text-slate-900 disabled:opacity-50"
        :disabled="loadingKey === 'generate-question'"
        @click="generateQuestion"
      >
        {{ loadingKey === "generate-question" ? "Running..." : "POST /api/questions/generate" }}
      </button>
      <button
        class="mt-2 w-full rounded-md bg-slate-800 px-3 py-2 text-sm font-medium text-slate-100 disabled:opacity-50"
        :disabled="loadingKey === 'list-questions'"
        @click="listQuestions"
      >
        {{ loadingKey === "list-questions" ? "Running..." : "GET /api/questions" }}
      </button>
    </article>
  </section>

  <section class="mt-8 rounded-xl border border-line bg-panel p-4">
    <h3 class="mb-2 text-lg font-medium">Response</h3>
    <p class="mb-3 text-sm text-slate-400">Status: {{ statusLine }}</p>
    <pre class="max-h-[420px] overflow-auto rounded-md bg-slate-900 p-3 text-xs text-cyan-100">{{ responseText }}</pre>
  </section>
</template>
