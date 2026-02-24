export const AUTH_TOKEN_STORAGE_KEY = "meindeutsch_auth_token";
export const AUTH_USER_STORAGE_KEY = "meindeutsch_auth_user";

export interface SessionUser {
  id: number;
  email: string;
  displayName: string | null;
  avatarUrl: string | null;
}

export const getAuthToken = (): string | null => {
  if (typeof window === "undefined") {
    return null;
  }
  return window.localStorage.getItem(AUTH_TOKEN_STORAGE_KEY);
};

export const setSession = (token: string, user: SessionUser): void => {
  window.localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, token);
  window.localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(user));
};

export const clearSession = (): void => {
  window.localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(AUTH_USER_STORAGE_KEY);
};

export const getSessionUser = (): SessionUser | null => {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(AUTH_USER_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
};

export const authFetch = async (input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> => {
  const token = getAuthToken();
  const headers = new Headers(init.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(input, { ...init, headers });
  if (response.status === 401) {
    clearSession();
    if (typeof window !== "undefined" && window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
  }
  return response;
};
