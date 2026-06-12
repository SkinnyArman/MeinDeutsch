<script setup lang="ts">
import { reactive, ref, watchEffect } from "vue";
import { useLanguage } from "@/libs/i18n";
import { API_ENDPOINTS, type ApiEndpointDefinition } from "@backend/contracts/api-manifest";
import AppContainer from "./AppContainer.vue";
import { useApiTriggerMutation } from "@/queries/api";

type FormState = Record<string, string>;

const { t } = useLanguage();

const loadingId = ref<string | null>(null);
const responseText = ref("-");
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

const runMutation = useApiTriggerMutation();

watchEffect(() => {
  if (runMutation.error.value) {
    statusLine.value = t.common.error();
  }
});

const runEndpoint = async (endpoint: ApiEndpointDefinition): Promise<void> => {
  loadingId.value = endpoint.id;
  try {
    const result = await runMutation.mutateAsync({
      endpoint,
      body: forms[endpoint.id]
    });
    statusLine.value = `${result.res.status} ${result.res.statusText}`;
    responseText.value = JSON.stringify(result.data, null, 2);
  } catch (error) {
    statusLine.value = t.common.error();
    responseText.value = JSON.stringify(
      {
        message: t.common.error(),
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
  <AppContainer>
    <section class="animate-fade-up space-y-6">
      <header>
        <h2 class="page-title">{{ t.settings.apiTools() }}</h2>
        <p class="page-subtitle">{{ t.settings.apiToolsDesc() }}</p>
      </header>

      <div class="grid gap-4 xl:grid-cols-2">
        <article v-for="endpoint in API_ENDPOINTS" :key="endpoint.id" class="card p-5">
          <div class="mb-3 flex items-center justify-between gap-3">
            <h2 class="text-base font-semibold">{{ endpoint.title }}</h2>
            <span class="chip-accent font-mono text-[11px]">{{ endpoint.method }}</span>
          </div>

          <p class="mb-1 font-mono text-xs text-[var(--muted)]">{{ endpoint.path }}</p>
          <p class="mb-4 text-sm text-[var(--muted)]">{{ endpoint.description }}</p>

          <div v-if="endpoint.requestFields.length" class="space-y-3">
            <div v-for="field in endpoint.requestFields" :key="`${endpoint.id}-${field.name}`" class="space-y-1.5">
              <label class="block text-xs font-medium text-[var(--muted)]">
                {{ field.label }}
                <span v-if="field.required" class="text-[var(--status-bad)]">*</span>
              </label>

              <textarea
                v-if="field.type === 'textarea'"
                v-model="forms[endpoint.id][field.name]"
                rows="4"
                :placeholder="field.placeholder"
                class="input resize-y"
              />

              <input
                v-else
                v-model="forms[endpoint.id][field.name]"
                :type="field.type"
                :placeholder="field.placeholder"
                class="input"
              />
            </div>
          </div>

          <button class="btn-primary mt-4 w-full" :disabled="loadingId === endpoint.id" @click="runEndpoint(endpoint)">
            {{ loadingId === endpoint.id ? t.common.loading() : `${t.common.submit()} ${endpoint.method}` }}
          </button>
        </article>
      </div>

      <section class="card p-5">
        <h3 class="mb-2 text-base font-semibold">{{ t.common.response() }}</h3>
        <p class="mb-3 text-xs text-[var(--muted)]">{{ t.common.status() }}: {{ statusLine }}</p>
        <pre class="panel-inset max-h-[420px] overflow-auto p-3.5 text-xs text-[color-mix(in_srgb,var(--text)_88%,var(--accent))]">
{{ responseText }}</pre>
      </section>
    </section>
  </AppContainer>
</template>
