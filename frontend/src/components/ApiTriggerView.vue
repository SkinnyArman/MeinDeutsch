<script setup lang="ts">
import { reactive, ref } from "vue";
import { API_ENDPOINTS, type ApiEndpointDefinition } from "@backend/contracts/api-manifest";

type FormState = Record<string, string>;

const baseUrl = ref("http://localhost:4000");
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
    const url = `${baseUrl.value}${endpoint.path}`;
    const init: RequestInit = { method: endpoint.method };

    if (endpoint.method === "POST") {
      const payload = forms[endpoint.id];
      init.headers = { "Content-Type": "application/json" };
      init.body = JSON.stringify(payload);
    }

    const res = await fetch(url, init);
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
  <section class="surface mb-8 p-4">
    <label class="mb-2 block text-sm muted">API Base URL</label>
    <input v-model="baseUrl" class="input-field" type="text" />
  </section>

  <section class="grid gap-4 xl:grid-cols-2">
    <article v-for="endpoint in API_ENDPOINTS" :key="endpoint.id" class="surface p-4">
      <div class="mb-3 flex items-center justify-between gap-3">
        <h2 class="text-lg font-medium">{{ endpoint.title }}</h2>
        <span class="method-badge">{{ endpoint.method }}</span>
      </div>

      <p class="mb-3 text-sm muted">{{ endpoint.path }}</p>
      <p class="mb-4 text-sm muted">{{ endpoint.description }}</p>

      <div v-if="endpoint.requestFields.length" class="space-y-3">
        <div v-for="field in endpoint.requestFields" :key="`${endpoint.id}-${field.name}`" class="space-y-1">
          <label class="block text-sm muted">
            {{ field.label }}
            <span v-if="field.required" class="text-rose-400">*</span>
          </label>

          <textarea
            v-if="field.type === 'textarea'"
            v-model="forms[endpoint.id][field.name]"
            rows="4"
            :placeholder="field.placeholder"
            class="input-field"
          />

          <input
            v-else
            v-model="forms[endpoint.id][field.name]"
            :type="field.type"
            :placeholder="field.placeholder"
            class="input-field"
          />
        </div>
      </div>

      <button class="btn-primary mt-4" :disabled="loadingId === endpoint.id" @click="runEndpoint(endpoint)">
        {{ loadingId === endpoint.id ? "Running..." : `Trigger ${endpoint.method}` }}
      </button>
    </article>
  </section>

  <section class="surface mt-8 p-4">
    <h3 class="mb-2 text-lg font-medium">Response</h3>
    <p class="mb-3 text-sm muted">Status: {{ statusLine }}</p>
    <pre class="response-pre">{{ responseText }}</pre>
  </section>
</template>
