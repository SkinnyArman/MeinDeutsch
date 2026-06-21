import type { UserLevelState } from "@/types/ApiTypes";
import { fetchJson } from "@/libs/http";
import { API_PATHS } from "@/config/api";

// Cached so the router guard checks the level once per session instead of on
// every navigation. Reset on logout / after the placement exam completes.
let cachedHasLevel: boolean | null = null;

export const hasAssessedLevel = async (): Promise<boolean> => {
  if (cachedHasLevel !== null) {
    return cachedHasLevel;
  }
  try {
    const { data } = await fetchJson<UserLevelState>(API_PATHS.level);
    cachedHasLevel = Boolean(data.cefrLevel);
  } catch {
    // On error, don't trap the user in onboarding; treat as known.
    cachedHasLevel = true;
  }
  return cachedHasLevel;
};

export const setLevelKnown = (hasLevel: boolean): void => {
  cachedHasLevel = hasLevel;
};

export const resetLevelCache = (): void => {
  cachedHasLevel = null;
};
