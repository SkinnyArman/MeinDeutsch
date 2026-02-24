<script setup lang="ts">
import { inject, reactive, ref } from "vue";
import { API_ENDPOINTS, type ApiEndpointDefinition } from "@backend/contracts/api-manifest";
import { authFetch } from "../utils/auth";

type FormState = Record<string, string>;

const props = defineProps<{
  baseUrl?: string;
}>();

const injectedBaseUrl = inject<import("vue").Ref<string>>("baseUrl");
const resolvedBaseUrl = props.baseUrl ?? injectedBaseUrl?.value ?? "http://localhost:4000";

const loadingId = ref<string | null>(null);
const responseText = ref("No request yet.");
const statusLine = ref("-");

const forms = reactive<Record<string, FormState>>(
  API_ENDPOINTS.reduce<Record<string, FormState>>((acc, endpoint) => {
    acc[endpoint.id] = endpoint.requestFields.reduce<FormState>((fields, field) => {
      fields[field.name] = "";
      return fields;
    }, {});
    return acc;
  }, {})
);

const runEndpoint = async (endpoint: ApiEndpointDefinition): Promise<void> => {
  loadingId.value = endpoint.id;

  try {
    const url = `${resolvedBaseUrl}${endpoint.path}`;
    const init: RequestInit = { method: endpoint.method };

    if (endpoint.method === "POST") {
      const payload = forms[endpoint.id];
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(payload);
    }

    const res = await authFetch(url, init);
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
    loadingId.value = null;
  }
};
</script>

<template>
  <section class="grid gap-4 xl:grid-cols-2">
    <article v-for="endpoint in API_ENDPOINTS" :key="endpoint.id" class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-lg font-medium">{{ endpoint.title }}</h2>
        <span class="rounded px-2 py-1 text-xs text-[var(--accent)] bg-[color-mix(in srgb, var(--accent) 16%, var(--panel-soft))] border border-[color-mix(in srgb, var(--accent) 35%, var(--line))]">
          {{ endpoint.method }}
        </span>
      </div>

      <p class="mb-3 text-sm text-[var(--muted)]">{{ endpoint.path }}</p>
      <p class="mb-4 text-sm text-[var(--muted)]">{{ endpoint.description }}</p>

      <div v-if="endpoint.requestFields.length" class="space-y-3">
        <div v-for="field in endpoint.requestFields" :key="`${endpoint.id}-${field.name}`" class="space-y-1">
          <label class="block text-sm text-[var(--muted)]">
            {{ field.label }}
            <span v-if="field.required" class="text-rose-400">*</span>
          </label>

          <textarea
            v-if="field.type === 'textarea'"
            v-model="forms[endpoint.id][field.name]"
            rows="4"
            :placeholder="field.placeholder"
            class="w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />

          <input
            v-else
            v-model="forms[endpoint.id][field.name]"
            :type="field.type"
            :placeholder="field.placeholder"
            class="w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm text-[var(--text)] outline-none focus:border-[var(--accent)]"
          />
        </div>
      </div>

      <button
        class="mt-4 w-full rounded-md bg-[var(--accent)] px-3 py-2 text-sm font-medium text-[var(--accent-contrast)] transition disabled:cursor-not-allowed disabled:opacity-50"
        :disabled="loadingId === endpoint.id"
        @click="runEndpoint(endpoint)"
      >
        {{ loadingId === endpoint.id ? "Running..." : `Trigger ${endpoint.method}` }}
      </button>
    </article>
  </section>

  <section class="mt-8 rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
    <h3 class="mb-2 text-lg font-medium">Response</h3>
    <p class="mb-3 text-sm text-[var(--muted)]">Status: {{ statusLine }}</p>
    <pre class="max-h-[420px] overflow-auto rounded-md bg-[var(--panel-soft)] p-3 text-xs text-[color-mix(in_srgb,var(--text)_88%,var(--accent))]">
{{ responseText }}</pre>
  </section>
</template>
