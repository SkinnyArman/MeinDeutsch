import type { ApiResponse } from "@/types/ApiTypes";
import { apiUrl } from "@/config/api";
import { authFetch } from "@/utils/auth";

type ApiSuccessResponse<T> = ApiResponse<T> & { data: T; error: null };

export const apiFetch = async (path: string, init: RequestInit = {}): Promise<Response> => {
  return authFetch(apiUrl(path), init);
};

export const fetchJson = async <T>(path: string, init: RequestInit = {}): Promise<ApiSuccessResponse<T>> => {
  const res = await apiFetch(path, init);
  const payload = (await res.json()) as ApiResponse<T>;
  if (!res.ok || !payload.success || payload.data === null) {
    throw new Error(payload.message || "Request failed");
  }
  return { ...payload, data: payload.data, error: null } as ApiSuccessResponse<T>;
};

export const fetchJsonNullable = async <T>(path: string, init: RequestInit = {}): Promise<ApiResponse<T | null>> => {
  const res = await apiFetch(path, init);
  const payload = (await res.json()) as ApiResponse<T | null>;
  if (!res.ok || !payload.success) {
    throw new Error(payload.message || "Request failed");
  }
  return payload;
};
