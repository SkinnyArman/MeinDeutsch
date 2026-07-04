<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useLanguage } from "@/libs/i18n";
import { ArrowRight, CheckCircle2, Loader2, MessagesSquare, Send, Sparkles, Tag, Trash2 } from "lucide-vue-next";
import type {
  ConversationDebrief,
  ConversationMessageRecord,
  ConversationWithMessages
} from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";
import AppContainer from "./AppContainer.vue";
import { BaseButton, BaseModal } from "./ui";
import {
  useConversationHistoryQuery,
  useConversationScenariosQuery,
  useDeleteConversationMutation,
  useEndConversationMutation,
  useSendConversationMessageMutation,
  useStartConversationMutation
} from "@/queries/conversation";
import { useDailyTalkSaveWordMutation } from "@/queries/dailyTalk";

const { t } = useLanguage();

type Mode = "picker" | "chat" | "review";
const mode = ref<Mode>("picker");
const conversationId = ref<number | null>(null);
const scenarioLabel = ref<string>("");
const messages = ref<ConversationMessageRecord[]>([]);
const debrief = ref<ConversationDebrief | null>(null);
const input = ref("");
const notice = ref<string | null>(null);
const savedWordKeys = ref<Set<string>>(new Set());
const scrollEl = ref<HTMLElement | null>(null);

const scenariosQuery = useConversationScenariosQuery();
const historyQuery = useConversationHistoryQuery();
const startMutation = useStartConversationMutation();
const sendMutation = useSendConversationMessageMutation();
const endMutation = useEndConversationMutation();
const deleteMutation = useDeleteConversationMutation();
const saveWordMutation = useDailyTalkSaveWordMutation();

const scenarios = computed(() => scenariosQuery.data.value ?? []);
// Group scenarios by category for the picker, preserving config order.
const scenarioGroups = computed(() => {
  const order: string[] = [];
  const groups: Record<string, typeof scenarios.value> = {};
  for (const s of scenarios.value) {
    if (!groups[s.category]) {
      groups[s.category] = [];
      order.push(s.category);
    }
    groups[s.category].push(s);
  }
  return order.map((category) => ({ category, items: groups[category] }));
});
const history = computed(() => historyQuery.data.value?.items ?? []);
const confirmDeleteId = ref<number | null>(null);
const canSend = computed(() => input.value.trim().length > 0 && !sendMutation.isPending.value);

const scrollToBottom = (): void => {
  void nextTick(() => {
    if (scrollEl.value) {
      scrollEl.value.scrollTop = scrollEl.value.scrollHeight;
    }
  });
};

watch(() => messages.value.length, scrollToBottom);

const startScenario = async (scenarioId?: string): Promise<void> => {
  notice.value = null;
  try {
    const data = await startMutation.mutateAsync(scenarioId ? { scenarioId } : {});
    conversationId.value = data.conversation.id;
    scenarioLabel.value = data.conversation.scenarioLabel;
    messages.value = data.messages;
    debrief.value = null;
    mode.value = "chat";
  } catch {
    notice.value = t.gespraech.loadFailed();
  }
};

const send = async (): Promise<void> => {
  const content = input.value.trim();
  if (!content || !conversationId.value) {
    return;
  }
  input.value = "";
  messages.value = [
    ...messages.value,
    { id: -Date.now(), role: "user", content, createdAt: new Date().toISOString() }
  ];
  try {
    const data = await sendMutation.mutateAsync({ conversationId: conversationId.value, content });
    messages.value = [...messages.value, data.reply];
  } catch {
    notice.value = t.gespraech.loadFailed();
  }
};

const endConversation = async (): Promise<void> => {
  if (!conversationId.value) {
    return;
  }
  try {
    const data = await endMutation.mutateAsync({ conversationId: conversationId.value });
    debrief.value = data.debrief;
    mode.value = "review";
    void historyQuery.refetch();
  } catch {
    notice.value = t.gespraech.loadFailed();
  }
};

const openConversation = async (id: number): Promise<void> => {
  notice.value = null;
  try {
    const { data } = await fetchJson<ConversationWithMessages>(API_PATHS.conversation(id));
    conversationId.value = data.id;
    scenarioLabel.value = data.scenarioLabel;
    messages.value = data.messages;
    if (data.status === "ended") {
      debrief.value = data.debrief;
      mode.value = "review";
    } else {
      debrief.value = null;
      mode.value = "chat";
    }
  } catch {
    notice.value = t.gespraech.loadFailed();
  }
};

const wordKey = (word: string): string => word.trim().toLowerCase();

const saveSuggestion = async (s: { word: string; description: string; examples: string[] }): Promise<void> => {
  await saveWordMutation.mutateAsync({
    word: s.word,
    description: s.description,
    examples: s.examples,
    category: "Gespräch"
  });
  savedWordKeys.value = new Set(savedWordKeys.value).add(wordKey(s.word));
};

const confirmDelete = async (): Promise<void> => {
  const id = confirmDeleteId.value;
  if (id === null) {
    return;
  }
  confirmDeleteId.value = null;
  await deleteMutation.mutateAsync({ conversationId: id });
  if (conversationId.value === id) {
    reset();
  }
  void historyQuery.refetch();
};

const reset = (): void => {
  mode.value = "picker";
  conversationId.value = null;
  messages.value = [];
  debrief.value = null;
  input.value = "";
  notice.value = null;
  savedWordKeys.value = new Set();
};
</script>

<template>
  <AppContainer size="sm">
    <section class="animate-fade-up space-y-6">
      <header class="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 class="page-title">{{ t.gespraech.title() }}</h1>
          <p class="page-subtitle">{{ t.gespraech.subtitle() }}</p>
        </div>
        <BaseButton v-if="mode !== 'picker'" variant="ghost" @click="reset">
          {{ t.gespraech.newChat() }}
        </BaseButton>
      </header>

      <p v-if="notice" class="notice-error">{{ notice }}</p>

      <!-- PICKER -->
      <template v-if="mode === 'picker'">
        <!-- Quick start: most of the time you just want to talk. -->
        <button
          class="card-hero card-hover flex w-full items-center justify-between gap-4 p-5 text-left"
          :disabled="startMutation.isPending.value"
          @click="startScenario()"
        >
          <span class="min-w-0">
            <span class="flex items-center gap-2 font-serif text-lg font-semibold">
              <MessagesSquare class="h-5 w-5 text-[var(--accent)]" />
              {{ t.gespraech.quickStart() }}
            </span>
            <span class="mt-1 block text-sm text-[var(--muted)]">{{ t.gespraech.quickStartHint() }}</span>
          </span>
          <Loader2 v-if="startMutation.isPending.value" class="h-5 w-5 shrink-0 animate-spin text-[var(--accent)]" />
          <ArrowRight v-else class="h-5 w-5 shrink-0 text-[var(--muted)]" />
        </button>

        <div class="space-y-4">
          <p class="eyebrow"><span class="eyebrow-icon"><MessagesSquare class="h-3 w-3" /></span>{{ t.gespraech.orPickScene() }}</p>
          <div v-for="group in scenarioGroups" :key="group.category" class="space-y-2">
            <p class="text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">{{ group.category }}</p>
            <div class="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
              <button
                v-for="s in group.items"
                :key="s.id"
                class="card card-hover p-3.5 text-left text-sm font-semibold"
                :disabled="startMutation.isPending.value"
                @click="startScenario(s.id)"
              >
                {{ s.label }}
              </button>
            </div>
          </div>
        </div>

        <div class="space-y-2.5">
          <p class="eyebrow">{{ t.gespraech.history() }}</p>
          <p v-if="!history.length" class="card border-dashed p-4 text-xs text-[var(--muted)]">{{ t.gespraech.noHistory() }}</p>
          <div v-for="c in history" :key="c.id" class="card card-hover flex items-center gap-2 p-2 pr-3">
            <button class="flex min-w-0 flex-1 items-center justify-between gap-3 p-2 text-left" @click="openConversation(c.id)">
              <span class="min-w-0">
                <span class="block text-sm font-semibold">{{ c.scenarioLabel }}</span>
                <span class="mt-0.5 block truncate text-xs text-[var(--muted)]">{{ c.preview ?? "…" }}</span>
              </span>
              <span class="flex shrink-0 items-center gap-2">
                <span v-if="c.status === 'ended'" class="chip text-[10px]">✓</span>
                <span class="chip text-[10px]">{{ t.gespraech.messages({ count: c.messageCount }) }}</span>
              </span>
            </button>
            <button
              class="shrink-0 rounded-lg border border-[var(--line)] p-2 text-[var(--muted)] transition hover:border-[var(--status-bad)] hover:text-[var(--status-bad)]"
              :title="t.common.delete()"
              @click="confirmDeleteId = c.id"
            >
              <Trash2 class="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </template>

      <!-- CHAT -->
      <template v-else-if="mode === 'chat'">
        <div class="card flex h-[60vh] flex-col p-0">
          <div class="flex items-center justify-between border-b border-[var(--line)] px-4 py-3">
            <span class="eyebrow"><span class="eyebrow-icon"><MessagesSquare class="h-3 w-3" /></span>{{ scenarioLabel }}</span>
            <BaseButton variant="soft" class="px-3 py-1.5 text-xs" :loading="endMutation.isPending.value" @click="endConversation">
              {{ endMutation.isPending.value ? t.gespraech.ending() : t.gespraech.end() }}
            </BaseButton>
          </div>

          <div ref="scrollEl" class="flex-1 space-y-3 overflow-y-auto px-4 py-4">
            <div
              v-for="m in messages"
              :key="m.id"
              class="flex"
              :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
            >
              <div
                class="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                :class="m.role === 'user'
                  ? 'bg-[var(--accent)] text-white rounded-br-sm'
                  : 'panel-inset rounded-bl-sm'"
              >
                {{ m.content }}
              </div>
            </div>
            <div v-if="sendMutation.isPending.value" class="flex justify-start">
              <div class="panel-inset inline-flex items-center gap-2 rounded-2xl rounded-bl-sm px-3.5 py-2.5 text-sm text-[var(--muted)]">
                <Loader2 class="h-3.5 w-3.5 animate-spin" /> {{ t.gespraech.typing() }}
              </div>
            </div>
          </div>

          <div class="border-t border-[var(--line)] p-3">
            <div class="flex items-end gap-2">
              <textarea
                v-model="input"
                rows="1"
                class="input max-h-32 min-h-[44px] flex-1 resize-none py-3"
                :placeholder="t.gespraech.inputPlaceholder()"
                @keydown.enter.exact.prevent="send"
              />
              <BaseButton variant="primary" class="h-11 w-11 rounded-xl p-0" :disabled="!canSend" @click="send">
                <Send class="h-4 w-4" />
              </BaseButton>
            </div>
          </div>
        </div>
      </template>

      <!-- REVIEW -->
      <template v-else>
        <div v-if="debrief" class="space-y-4">
          <!-- The full transcript, read-only -->
          <div v-if="messages.length" class="card p-4">
            <span class="eyebrow mb-3"><span class="eyebrow-icon"><MessagesSquare class="h-3 w-3" /></span>{{ t.gespraech.transcript() }}</span>
            <div class="max-h-[40vh] space-y-3 overflow-y-auto">
              <div
                v-for="m in messages"
                :key="m.id"
                class="flex"
                :class="m.role === 'user' ? 'justify-end' : 'justify-start'"
              >
                <div
                  class="max-w-[80%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed"
                  :class="m.role === 'user' ? 'bg-[var(--accent)] text-white rounded-br-sm' : 'panel-inset rounded-bl-sm'"
                >
                  {{ m.content }}
                </div>
              </div>
            </div>
          </div>

          <div v-if="debrief.summary" class="card-hero p-5">
            <span class="eyebrow"><span class="eyebrow-icon"><CheckCircle2 class="h-3 w-3" /></span>{{ t.gespraech.summary() }}</span>
            <p class="mt-3 text-sm leading-relaxed">{{ debrief.summary }}</p>
          </div>

          <div class="card p-5">
            <span class="eyebrow">{{ t.gespraech.corrections() }}</span>
            <p v-if="!debrief.corrections.length" class="mt-3 text-sm text-[var(--muted)]">{{ t.gespraech.noCorrections() }}</p>
            <ul v-else class="mt-3 space-y-2.5">
              <li v-for="(c, i) in debrief.corrections" :key="`c-${i}`" class="panel-inset px-3.5 py-3">
                <p class="text-sm">
                  <span class="text-[var(--status-bad)] line-through">{{ c.original }}</span>
                  <span class="mx-1.5 text-[var(--muted)]">→</span>
                  <span class="font-semibold text-[var(--status-good)]">{{ c.correction }}</span>
                </p>
                <p class="mt-1 text-xs leading-relaxed text-[var(--muted)]">{{ c.note }}</p>
              </li>
            </ul>
          </div>

          <div v-if="debrief.suggestions.length" class="card p-5">
            <span class="eyebrow"><span class="eyebrow-icon"><Sparkles class="h-3 w-3" /></span>{{ t.gespraech.suggestions() }}</span>
            <div class="mt-3 grid gap-3 sm:grid-cols-2">
              <div v-for="(s, i) in debrief.suggestions" :key="`s-${i}`" class="panel-inset flex flex-col p-3.5">
                <div class="flex items-start justify-between gap-2">
                  <div class="min-w-0">
                    <p class="text-sm font-bold">{{ s.word }}</p>
                    <p class="mt-1 text-xs leading-relaxed text-[var(--muted)]">{{ s.description }}</p>
                  </div>
                  <button
                    class="btn-soft shrink-0 px-2.5 py-1.5 text-[11px]"
                    :disabled="savedWordKeys.has(wordKey(s.word))"
                    @click="saveSuggestion(s)"
                  >
                    <Tag class="h-3 w-3" />
                    {{ savedWordKeys.has(wordKey(s.word)) ? t.gespraech.saved() : t.gespraech.save() }}
                  </button>
                </div>
                <ul class="mt-2 space-y-1">
                  <li
                    v-for="(ex, exIdx) in s.examples"
                    :key="exIdx"
                    class="border-l-2 border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] pl-2.5 text-xs italic text-[var(--muted)]"
                  >
                    {{ ex }}
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <BaseButton variant="primary" @click="reset">{{ t.gespraech.backToStart() }}</BaseButton>
        </div>
      </template>

      <!-- Delete confirmation -->
      <BaseModal
        :open="confirmDeleteId !== null"
        :title="t.gespraech.deleteConfirmTitle()"
        :subtitle="t.gespraech.deleteConfirmBody()"
        size="sm"
        @close="confirmDeleteId = null"
      >
        <div class="flex justify-end gap-2.5">
          <BaseButton variant="ghost" @click="confirmDeleteId = null">{{ t.common.cancel() }}</BaseButton>
          <BaseButton
            variant="primary"
            class="!bg-none !bg-[var(--status-bad)] !shadow-none"
            :loading="deleteMutation.isPending.value"
            @click="confirmDelete"
          >
            {{ t.common.delete() }}
          </BaseButton>
        </div>
      </BaseModal>
    </section>
  </AppContainer>
</template>
