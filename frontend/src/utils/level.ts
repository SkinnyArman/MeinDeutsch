import { ref } from "vue";
import type { UserLevelState } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

// Reactive level gate. The placement exam is shown as a blocking modal (in
// App.vue) rather than a route, so this state drives the overlay's visibility.
//   null  = not yet checked
//   false = no level yet → must take the exam
//   true  = level assessed
export const levelKnown = ref<boolean | null>(null);

// Manual retake request (from Settings) opens the exam even when leveled.
export const examOpen = ref(false);

export const refreshLevel = async (): Promise<void> => {
  try {
    const { data } = await fetchJson<UserLevelState>(API_PATHS.level);
    levelKnown.value = Boolean(data.cefrLevel);
  } catch {
    // Don't trap the user behind the exam on a transient error.
    levelKnown.value = true;
  }
};

export const markLeveled = (): void => {
  levelKnown.value = true;
  examOpen.value = false;
};

export const resetLevel = (): void => {
  levelKnown.value = null;
  examOpen.value = false;
};

export const requestRetake = (): void => {
  examOpen.value = true;
};
