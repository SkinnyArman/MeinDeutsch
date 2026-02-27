import type { ApiResponse } from "@/types/ApiTypes";
import { apiUrl } from "@/config/api";
import { authFetch } from "@/utils/auth";

export const apiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  return authFetch(apiUrl(path), init);
};

export const fetchJson = async <T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T>> => {
  const res = await apiFetch(path, init);
  const payload = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !payload.success || payload.data === null) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
};

export const fetchJsonNullable = async <T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T | null>> => {
  const res = await apiFetch(path, init);
  const payload = (await res.json()) as ApiResponse<T | null>;
  if (!res.ok || !payload.success) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
};
