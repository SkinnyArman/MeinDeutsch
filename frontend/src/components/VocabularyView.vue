<script setup lang="ts">
import { inject, onMounted, ref, watch } from "vue";

interface ApiErrorBody {
  code: string;
  details?: unknown;
}

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
  error: ApiErrorBody | null;
}

interface VocabularyItemRecord {
  id: number;
  word: string;
  description: string;
  examples: string[];
  category: string;
  sourceAnswerLogId: number | null;
  sourceQuestionId: number | null;
  createdAt: string;
}

const baseUrl = inject<import("vue").Ref<string>>("baseUrl")?.value ?? "http://localhost:4000";
const loadingCategories = ref(false);
const loadingWords = ref(false);
const categories = ref<string[]>([]);
const selectedCategory = ref<string>("");
const words = ref<VocabularyItemRecord[]>([]);
const notice = ref<{ type: "success" | "error"; text: string } | null>(null);

const setError = (text: string): void => {
  notice.value = { type: "error", text };
};

const setSuccess = (text: string): void => {
  notice.value = { type: "success", text };
};

const parseApiResponse = async <T>(res: Response): Promise<ApiResponse<T>> => {
  const payload = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !payload.success || payload.data === null) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
};

const loadCategories = async (): Promise<void> => {
  loadingCategories.value = true;
  try {
    const res = await fetch(`${baseUrl}/api/vocabulary/categories`);
    const payload = await parseApiResponse<string[]>(res);
    categories.value = payload.data;
    if (!selectedCategory.value && categories.value.length > 0) {
      selectedCategory.value = categories.value[0];
    }
    setSuccess(`Loaded ${categories.value.length} categories.`);
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not load vocabulary categories");
  } finally {
    loadingCategories.value = false;
  }
};

const loadWords = async (): Promise<void> => {
  loadingWords.value = true;
  try {
    const query = selectedCategory.value
      ? `?${new URLSearchParams({ category: selectedCategory.value }).toString()}`
      : "";
    const res = await fetch(`${baseUrl}/api/vocabulary${query}`);
    const payload = await parseApiResponse<VocabularyItemRecord[]>(res);
    words.value = payload.data;
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not load vocabulary words");
  } finally {
    loadingWords.value = false;
  }
};

const refreshAll = async (): Promise<void> => {
  await loadCategories();
  await loadWords();
};

watch(
  () => selectedCategory.value,
  () => {
    void loadWords();
  }
);

onMounted(() => {
  void refreshAll();
});
</script>

<template>
  <section class="space-y-4">
    <header class="relative overflow-hidden rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--surface-shadow)]">
      <div class="absolute inset-0 bg-[radial-gradient(circle_at_12%_14%,color-mix(in_srgb,var(--accent)_20%,transparent)_0%,transparent_45%)] opacity-60"></div>
      <div class="relative flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-2xl font-semibold tracking-tight">Vocabulary</h2>
          <p class="mt-1 text-sm text-[var(--muted)]">Saved words grouped by category.</p>
        </div>
        <button
          class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-3 py-2 text-sm font-medium transition hover:border-[var(--accent)]"
          :disabled="loadingCategories || loadingWords"
          @click="refreshAll"
        >
          {{ loadingCategories || loadingWords ? "Refreshing..." : "Refresh" }}
        </button>
      </div>
    </header>

    <p
      v-if="notice"
      class="rounded-lg border px-3 py-2 text-sm"
      :class="notice.type === 'error'
        ? 'border-[color-mix(in_srgb,var(--status-bad)_50%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_14%,var(--panel))]'
        : 'border-[color-mix(in_srgb,var(--status-good)_50%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))]'"
    >
      {{ notice.text }}
    </p>

    <div class="grid gap-4 md:grid-cols-[240px_1fr]">
      <aside class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]">
        <p class="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Categories</p>
        <div v-if="!categories.length && !loadingCategories" class="rounded-md border border-dashed border-[var(--line)] p-3 text-sm text-[var(--muted)]">
          No categories yet.
        </div>
        <nav v-else class="space-y-2">
          <button
            v-for="category in categories"
            :key="category"
            class="w-full rounded-md border px-3 py-2 text-left text-sm transition"
            :class="selectedCategory === category
              ? 'border-[var(--accent)] bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel-soft))]'
              : 'border-[var(--line)] bg-[var(--panel-soft)] hover:border-[var(--accent)]'"
            @click="selectedCategory = category"
          >
            {{ category }}
          </button>
        </nav>
      </aside>

      <section class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-4 shadow-[var(--surface-shadow)]">
        <div class="mb-3 flex items-center justify-between gap-3">
          <h3 class="text-lg font-semibold">{{ selectedCategory || "All categories" }}</h3>
          <span class="rounded border border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel-soft))] px-2 py-1 text-xs text-[var(--accent)]">
            {{ words.length }} word(s)
          </span>
        </div>

        <div v-if="!words.length && !loadingWords" class="rounded-md border border-dashed border-[var(--line)] p-4 text-sm text-[var(--muted)]">
          No words in this category yet.
        </div>

        <ul v-else class="space-y-3">
          <li v-for="item in words" :key="item.id" class="rounded-lg border border-[var(--line)] bg-[var(--panel-soft)] p-3">
            <div class="mb-2 flex items-center justify-between gap-3">
              <p class="text-sm font-semibold">{{ item.word }}</p>
              <p class="text-xs text-[var(--muted)]">{{ new Date(item.createdAt).toLocaleString() }}</p>
            </div>
            <p class="text-sm text-[var(--muted)]">{{ item.description }}</p>
            <div v-if="item.examples.length" class="mt-2 space-y-1 text-xs text-[var(--muted)]">
              <p v-for="(example, idx) in item.examples" :key="`ex-${item.id}-${idx}`">Example: {{ example }}</p>
            </div>
          </li>
        </ul>
      </section>
    </div>
  </section>
</template>
