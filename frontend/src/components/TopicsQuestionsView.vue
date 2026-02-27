<script setup lang="ts">
import { reactive, ref, watchEffect } from "vue";
import { useLanguage } from "@/libs/i18n";
import { Plus, Trash2 } from "lucide-vue-next";
import AppContainer from "./AppContainer.vue";
import { useTopicsQuery, useCreateTopicMutation, useDeleteTopicMutation } from "@/queries/topics";

const { t } = useLanguage();
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);

const form = reactive({
  topicName: "",
  topicDescription: ""
});

const topicsQuery = useTopicsQuery();
const createMutation = useCreateTopicMutation();
const deleteMutation = useDeleteTopicMutation();

watchEffect(() => {
  if (topicsQuery.error.value) {
    notice.value = { type: "error", text: topicsQuery.error.value.message };
  }
  if (createMutation.error.value) {
    notice.value = { type: "error", text: createMutation.error.value.message };
  }
  if (deleteMutation.error.value) {
    notice.value = { type: "error", text: deleteMutation.error.value.message };
  }
});

const handleCreate = async () => {
  if (!form.topicName.trim()) {
    notice.value = { type: "error", text: t.topics.nameRequired() };
    return;
  }
  await createMutation.mutateAsync({
    name: form.topicName,
    description: form.topicDescription || undefined
  });
  form.topicName = "";
  form.topicDescription = "";
  notice.value = { type: "success", text: t.topics.created() };
};

const handleDelete = async (topicId: number) => {
  await deleteMutation.mutateAsync(topicId);
  notice.value = { type: "success", text: t.topics.deleted() };
};
</script>

<template>
  <AppContainer>
    <section class="space-y-4">
      <header>
        <h2 class="font-serif text-3xl font-semibold tracking-tight">{{ t.topics.title() }}</h2>
      </header>

      <p
        v-if="notice"
        class="rounded-lg border px-3 py-2 text-xs"
        :class="notice.type === 'error'
          ? 'border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_14%,var(--panel))]'
          : 'border-[color-mix(in_srgb,var(--status-good)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))]'
        "
      >
        {{ notice.text }}
      </p>

      <div class="grid gap-4 md:grid-cols-[280px_1fr]">
        <form
          class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]"
          @submit.prevent="handleCreate"
        >
          <div class="space-y-3">
            <div>
              <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.topics.nameLabel() }}</label>
              <input
                v-model="form.topicName"
                class="w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                type="text"
              />
            </div>
            <div>
              <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">{{ t.topics.descriptionLabel() }}</label>
              <textarea
                v-model="form.topicDescription"
                class="w-full rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm"
                rows="3"
              />
            </div>
            <button
              class="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[var(--line)] bg-[var(--panel)] px-3 py-2 text-xs transition hover:border-[var(--accent)] disabled:opacity-60"
              type="submit"
              :disabled="createMutation.isPending.value"
            >
              <Plus class="h-3.5 w-3.5" />
              {{ t.common.create() }}
            </button>
          </div>
        </form>

        <div class="space-y-2">
          <div v-if="!topicsQuery.data.value?.length && !topicsQuery.isFetching.value" class="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
            {{ t.dailyTalk.noHistory() }}
          </div>
          <article
            v-for="topic in topicsQuery.data.value ?? []"
            :key="topic.id"
            class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]"
          >
            <div class="flex items-start justify-between gap-2">
              <div>
                <p class="text-sm font-semibold">{{ topic.name }}</p>
                <p class="mt-1 text-xs text-[var(--muted)]">{{ topic.description || '-' }}</p>
              </div>
              <button
                class="inline-flex items-center gap-1 rounded-md border border-[var(--line)] px-2 py-1 text-[10px] transition hover:border-[var(--status-bad)]"
                :disabled="deleteMutation.isPending.value"
                @click="handleDelete(topic.id)"
              >
                <Trash2 class="h-3 w-3" />
                {{ t.common.delete() }}
              </button>
            </div>
          </article>
        </div>
      </div>
    </section>
  </AppContainer>
</template>
