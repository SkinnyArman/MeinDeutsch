<script setup lang="ts">
import { computed, inject, onMounted, ref, watch } from "vue";
import { authFetch } from "../utils/auth";

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
  srsIntervalDays: number;
  srsEaseFactor: number;
  srsDueAt: string | null;
  srsLastRating: number | null;
  srsReviewCount: number;
  srsLapseCount: number;
  srsLastReviewedAt: string | null;
  createdAt: string;
}

const baseUrl = inject<import("vue").Ref<string>>("baseUrl")?.value ?? "http://localhost:4000";
const loadingCategories = ref(false);
const loadingWords = ref(false);
const loadingAllWords = ref(false);
const categories = ref<string[]>([]);
const selectedCategory = ref<string>("");
const words = ref<VocabularyItemRecord[]>([]);
const allWords = ref<VocabularyItemRecord[]>([]);
const reviewingWordId = ref<number | null>(null);
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
    const res = await authFetch(`${baseUrl}/api/vocabulary/categories`);
    const payload = await parseApiResponse<string[]>(res);
    categories.value = payload.data;
    if (!selectedCategory.value && categories.value.length > 0) {
      selectedCategory.value = categories.value[0];
    }
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not load vocabulary categories");
  } finally {
    loadingCategories.value = false;
  }
};

const loadAllWords = async (): Promise<void> => {
  loadingAllWords.value = true;
  try {
    const res = await authFetch(`${baseUrl}/api/vocabulary`);
    const payload = await parseApiResponse<VocabularyItemRecord[]>(res);
    allWords.value = payload.data;
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not load full vocabulary stats");
  } finally {
    loadingAllWords.value = false;
  }
};

const loadWords = async (): Promise<void> => {
  loadingWords.value = true;
  try {
    const query = selectedCategory.value
      ? `?${new URLSearchParams({ category: selectedCategory.value }).toString()}`
      : "";
    const res = await authFetch(`${baseUrl}/api/vocabulary${query}`);
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
  await loadAllWords();
  await loadWords();
  setSuccess("Vocabulary refreshed.");
};

const dueState = (item: VocabularyItemRecord): "due" | "soon" | "later" => {
  if (!item.srsDueAt) {
    return "due";
  }
  const dueMs = new Date(item.srsDueAt).getTime();
  const nowMs = Date.now();
  const diffDays = (dueMs - nowMs) / (24 * 60 * 60 * 1000);
  if (diffDays <= 0) {
    return "due";
  }
  if (diffDays <= 3) {
    return "soon";
  }
  return "later";
};

const dueBadge = (item: VocabularyItemRecord): string => {
  const state = dueState(item);
  if (state === "due") {
    return "Due";
  }
  if (state === "soon") {
    return "Soon";
  }
  return `${Math.ceil((new Date(item.srsDueAt ?? Date.now()).getTime() - Date.now()) / (24 * 60 * 60 * 1000))}d`;
};

const totalWords = computed(() => allWords.value.length);
const dueNowCount = computed(() => allWords.value.filter((item) => dueState(item) === "due").length);
const dueSoonCount = computed(() => allWords.value.filter((item) => dueState(item) === "soon").length);

const categoryCountMap = computed<Record<string, number>>(() => {
  const acc: Record<string, number> = {};
  for (const item of allWords.value) {
    acc[item.category] = (acc[item.category] ?? 0) + 1;
  }
  return acc;
});

const ratingLabel = (rating: number): string => {
  if (rating === 1) {
    return "Again";
  }
  if (rating === 2) {
    return "Hard";
  }
  if (rating === 3) {
    return "Good";
  }
  return "Easy";
};

const categoryIcon = (category: string): string => {
  const key = category.trim().toLowerCase();
  if (key.includes("daily") || key.includes("routine")) {
    return "clock";
  }
  if (key.includes("food") || key.includes("drink")) {
    return "utensils";
  }
  if (key.includes("work") || key.includes("career")) {
    return "briefcase";
  }
  if (key.includes("home") || key.includes("living")) {
    return "house";
  }
  if (key.includes("health") || key.includes("body")) {
    return "heart";
  }
  if (key.includes("travel") || key.includes("place")) {
    return "pin";
  }
  return "dot";
};

const submitSrsRating = async (item: VocabularyItemRecord, rating: 1 | 2 | 3 | 4): Promise<void> => {
  reviewingWordId.value = item.id;
  try {
    const res = await authFetch(`${baseUrl}/api/vocabulary/${item.id}/review`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ rating })
    });
    const payload = await parseApiResponse<VocabularyItemRecord>(res);
    words.value = words.value.map((word) => (word.id === item.id ? payload.data : word));
    allWords.value = allWords.value.map((word) => (word.id === item.id ? payload.data : word));
    setSuccess(`Review saved: ${item.word} -> ${ratingLabel(rating)}`);
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not submit review");
  } finally {
    reviewingWordId.value = null;
  }
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
  <section class="mx-auto w-full max-w-5xl space-y-5">
    <header>
      <h2 class="font-serif text-3xl font-semibold tracking-tight">Vocabulary</h2>
      <p class="mt-1 text-xs text-[var(--muted)]">Browse and review your saved words by category.</p>
    </header>

    <p
      v-if="notice"
      class="rounded-lg border px-3 py-2 text-xs"
      :class="notice.type === 'error'
        ? 'border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_14%,var(--panel))]'
        : 'border-[color-mix(in_srgb,var(--status-good)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))]'"
    >
      {{ notice.text }}
    </p>

    <div class="grid gap-5 md:grid-cols-[220px_1fr]">
      <aside>
        <div class="mb-2 flex items-center justify-between text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          <p>Categories</p>
          <button
            class="rounded-md border border-[var(--line)] bg-[var(--panel)] px-2 py-1 text-[10px] transition hover:border-[var(--accent)]"
            :disabled="loadingWords || loadingAllWords || loadingCategories"
            @click="refreshAll"
          >
            {{ loadingWords || loadingAllWords || loadingCategories ? "..." : "Refresh" }}
          </button>
        </div>
        <div v-if="!categories.length && !loadingCategories" class="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-3 text-xs text-[var(--muted)]">
          No categories yet.
        </div>
        <nav v-else class="space-y-1">
          <button
            v-for="category in categories"
            :key="category"
            class="flex w-full items-center justify-between rounded-lg border px-2.5 py-2 text-left text-xs transition"
            :class="selectedCategory === category
              ? 'border-[color-mix(in_srgb,var(--accent)_35%,var(--line))] bg-[color-mix(in_srgb,var(--accent)_14%,var(--panel-soft))]'
              : 'border-transparent bg-transparent text-[var(--muted)] hover:border-[var(--line)] hover:bg-[var(--panel-soft)]'"
            @click="selectedCategory = category"
          >
            <span class="flex min-w-0 items-center gap-2">
              <svg v-if="categoryIcon(category) === 'clock'" viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 shrink-0">
                <circle cx="10" cy="10" r="6.5" stroke="currentColor" stroke-width="1.5" />
                <path d="M10 6.5v4l2.5 1.5" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
              </svg>
              <svg v-else-if="categoryIcon(category) === 'utensils'" viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 shrink-0">
                <path d="M6 3.5v6M8 3.5v6M7 9.5v7M12.5 3.5v5a2.5 2.5 0 0 0 2.5 2.5V17" stroke="currentColor" stroke-linecap="round" stroke-width="1.5" />
              </svg>
              <svg v-else-if="categoryIcon(category) === 'briefcase'" viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 shrink-0">
                <rect x="3" y="6" width="14" height="10" rx="1.8" stroke="currentColor" stroke-width="1.5" />
                <path d="M7 6V4.8A1.8 1.8 0 0 1 8.8 3h2.4A1.8 1.8 0 0 1 13 4.8V6" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <svg v-else-if="categoryIcon(category) === 'house'" viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 shrink-0">
                <path d="m3.5 9 6.5-5 6.5 5v7h-4.5v-4h-4v4H3.5V9Z" stroke="currentColor" stroke-linejoin="round" stroke-width="1.5" />
              </svg>
              <svg v-else-if="categoryIcon(category) === 'heart'" viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 shrink-0">
                <path d="M10 16s-5.5-3.1-5.5-7.2A3.2 3.2 0 0 1 10 6.8a3.2 3.2 0 0 1 5.5 2c0 4.1-5.5 7.2-5.5 7.2Z" stroke="currentColor" stroke-width="1.5" />
              </svg>
              <svg v-else-if="categoryIcon(category) === 'pin'" viewBox="0 0 20 20" fill="none" class="h-3.5 w-3.5 shrink-0">
                <path d="M10 17s4.5-4.2 4.5-7.7a4.5 4.5 0 1 0-9 0C5.5 12.8 10 17 10 17Z" stroke="currentColor" stroke-width="1.5" />
                <circle cx="10" cy="9.3" r="1.6" fill="currentColor" />
              </svg>
              <span v-else class="inline-flex h-1.5 w-1.5 rounded-full bg-current opacity-70" />
              <span class="truncate">{{ category }}</span>
            </span>
            <span class="text-[10px] opacity-65">{{ categoryCountMap[category] ?? 0 }}</span>
          </button>
        </nav>
      </aside>

      <section class="space-y-2">
        <div class="flex items-center gap-4 px-1 text-xs">
          <div class="inline-flex items-center gap-1 text-[var(--muted)]">
            <svg viewBox="0 0 20 20" fill="none" class="h-4 w-4">
              <path d="M3 4.5h6a2 2 0 0 1 2 2V16H5a2 2 0 0 1-2-2V4.5Zm14 0h-6a2 2 0 0 0-2 2V16h6a2 2 0 0 0 2-2V4.5Z" stroke="currentColor" stroke-width="1.5" />
            </svg>
            <span>{{ totalWords }} words</span>
          </div>
          <span class="h-4 w-px bg-[var(--line)]" />
          <span class="rounded-full border border-[color-mix(in_srgb,var(--status-bad)_38%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_12%,var(--panel-soft))] px-2 py-0.5">
            {{ dueNowCount }} due
          </span>
          <span class="rounded-full border border-[var(--line)] bg-[var(--panel)] px-2 py-0.5 text-[var(--muted)]">
            {{ dueSoonCount }} soon
          </span>
        </div>

        <div v-if="!words.length && !loadingWords" class="rounded-xl border border-dashed border-[var(--line)] bg-[var(--panel)] p-4 text-sm text-[var(--muted)]">
          No words in this category yet.
        </div>

        <article
          v-for="item in words"
          :key="item.id"
          class="rounded-xl border border-[var(--line)] bg-[var(--panel)] p-3 shadow-[var(--surface-shadow)]"
        >
          <div class="flex items-start justify-between gap-2">
            <div>
              <p class="text-base font-semibold">{{ item.word }}</p>
              <p class="text-xs text-[var(--muted)]">{{ item.description }}</p>
            </div>
            <span
              class="rounded-full border px-2 py-0.5 text-[10px]"
              :class="dueState(item) === 'due'
                ? 'border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] text-[var(--status-bad)]'
                : dueState(item) === 'soon'
                  ? 'border-[color-mix(in_srgb,var(--accent)_45%,var(--line))] text-[var(--accent)]'
                  : 'border-[var(--line)] text-[var(--muted)]'"
            >
              {{ dueBadge(item) }}
            </span>
          </div>

          <div v-if="item.examples.length" class="mt-2 space-y-1">
            <p v-for="(example, idx) in item.examples" :key="`ex-${item.id}-${idx}`" class="truncate border-l-2 border-[var(--line)] pl-2 text-[11px] italic text-[var(--muted)]">
              {{ example }}
            </p>
          </div>

          <p class="mt-2 text-[10px] text-[var(--muted)]">{{ item.srsReviewCount }} reviews · {{ item.srsLapseCount }} lapses</p>

          <div class="mt-2 grid grid-cols-4 gap-1.5 text-[11px]">
            <button
              class="rounded-md border border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_18%,var(--panel-soft))] px-2 py-1 font-semibold text-[var(--status-bad)] transition hover:opacity-90 disabled:opacity-60"
              :disabled="reviewingWordId === item.id"
              @click="submitSrsRating(item, 1)"
            >
              Again
            </button>
            <button
              class="rounded-md border border-[var(--line)] bg-[var(--panel-soft)] px-2 py-1 font-medium transition hover:border-[var(--accent)] disabled:opacity-60"
              :disabled="reviewingWordId === item.id"
              @click="submitSrsRating(item, 2)"
            >
              Hard
            </button>
            <button
              class="rounded-md border border-[color-mix(in_srgb,var(--status-good)_40%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_16%,var(--panel-soft))] px-2 py-1 font-semibold text-[var(--status-good)] transition hover:opacity-90 disabled:opacity-60"
              :disabled="reviewingWordId === item.id"
              @click="submitSrsRating(item, 3)"
            >
              Good
            </button>
            <button
              class="rounded-md border border-[color-mix(in_srgb,var(--status-good)_55%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_26%,var(--panel-soft))] px-2 py-1 font-semibold text-[var(--status-good)] transition hover:opacity-90 disabled:opacity-60"
              :disabled="reviewingWordId === item.id"
              @click="submitSrsRating(item, 4)"
            >
              Easy
            </button>
          </div>
        </article>
      </section>
    </div>
  </section>
</template>
