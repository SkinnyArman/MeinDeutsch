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
    <section class="animate-fade-up space-y-6">
      <header>
        <h2 class="page-title">{{ t.topics.title() }}</h2>
        <p class="page-subtitle">{{ t.settings.topicsDesc() }}</p>
      </header>

      <p v-if="notice" :class="notice.type === 'error' ? 'notice-error' : 'notice-success'">
        {{ notice.text }}
      </p>

      <div class="grid gap-5 md:grid-cols-[300px_1fr]">
        <form class="card h-fit space-y-4 p-4 md:sticky md:top-20" @submit.prevent="handleCreate">
          <div>
            <label class="eyebrow">{{ t.topics.nameLabel() }}</label>
            <input v-model="form.topicName" class="input mt-2" type="text" />
          </div>
          <div>
            <label class="eyebrow">{{ t.topics.descriptionLabel() }}</label>
            <textarea v-model="form.topicDescription" class="input mt-2 resize-y" rows="3" />
          </div>
          <button class="btn-primary w-full" type="submit" :disabled="createMutation.isPending.value">
            <Plus class="h-4 w-4" />
            {{ t.common.create() }}
          </button>
        </form>

        <div class="space-y-2.5">
          <div
            v-if="!topicsQuery.data.value?.length && !topicsQuery.isFetching.value"
            class="card border-dashed p-5 text-sm text-[var(--muted)]"
          >
            {{ t.dailyTalk.noHistory() }}
          </div>
          <article v-for="topic in topicsQuery.data.value ?? []" :key="topic.id" class="card card-hover p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="min-w-0">
                <p class="text-sm font-bold">{{ topic.name }}</p>
                <p class="mt-1 text-xs leading-relaxed text-[var(--muted)]">{{ topic.description || '-' }}</p>
              </div>
              <button
                class="btn-ghost shrink-0 px-2.5 py-1.5 text-[11px] hover:border-[var(--status-bad)] hover:text-[var(--status-bad)]"
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
