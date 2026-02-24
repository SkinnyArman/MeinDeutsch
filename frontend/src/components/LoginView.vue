<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { setSession, type SessionUser } from "../utils/auth";

interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T | null;
}

interface GoogleAuthResult {
  token: string;
  user: SessionUser;
}

type GoogleCredentialResponse = {
  credential: string;
};

declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (config: {
            client_id: string;
            callback: (response: GoogleCredentialResponse) => void;
          }) => void;
          renderButton: (element: HTMLElement, options: Record<string, unknown>) => void;
        };
      };
    };
  }
}

const router = useRouter();
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const BASE_URL = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000";
const googleButtonRoot = ref<HTMLElement | null>(null);
const notice = ref<{ type: "error" | "success"; text: string } | null>(null);
const loading = ref(false);

const setError = (text: string): void => {
  notice.value = { type: "error", text };
};

const handleCredential = async (response: GoogleCredentialResponse): Promise<void> => {
  loading.value = true;
  try {
    const res = await fetch(`${BASE_URL}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: response.credential })
    });
    const payload = (await res.json()) as ApiResponse<GoogleAuthResult>;
    if (!res.ok || !payload.success || !payload.data) {
      throw new Error(payload.message || "Google sign-in failed");
    }

    setSession(payload.data.token, payload.data.user);
    notice.value = { type: "success", text: "Signed in successfully. Redirecting..." };
    await router.replace("/daily-talk");
  } catch (error) {
    setError(error instanceof Error ? error.message : "Sign-in failed");
  } finally {
    loading.value = false;
  }
};

const loadGoogleScript = async (): Promise<void> =>
  new Promise((resolve, reject) => {
    if (window.google?.accounts?.id) {
      resolve();
      return;
    }

    const existing = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existing) {
      existing.addEventListener("load", () => resolve());
      existing.addEventListener("error", () => reject(new Error("Could not load Google script")));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error("Could not load Google script"));
    document.head.appendChild(script);
  });

onMounted(async () => {
  if (!GOOGLE_CLIENT_ID) {
    setError("VITE_GOOGLE_CLIENT_ID is missing.");
    return;
  }

  try {
    await loadGoogleScript();
    if (!window.google || !googleButtonRoot.value) {
      throw new Error("Google SDK is unavailable");
    }

    window.google.accounts.id.initialize({
      client_id: GOOGLE_CLIENT_ID,
      callback: (credentialResponse: GoogleCredentialResponse) => {
        void handleCredential(credentialResponse);
      }
    });

    window.google.accounts.id.renderButton(googleButtonRoot.value, {
      type: "standard",
      theme: "outline",
      size: "large",
      text: "continue_with",
      shape: "pill"
    });
  } catch (error) {
    setError(error instanceof Error ? error.message : "Could not initialize Google sign-in");
  }
});
</script>

<template>
  <main class="min-h-screen p-4 md:p-8">
    <section class="mx-auto max-w-xl rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-8 shadow-[var(--surface-shadow)]">
      <h1 class="text-3xl font-semibold tracking-tight">MeinDeutsch</h1>
      <p class="mt-2 text-sm text-[var(--muted)]">Sign in with Google to access your personal learning data.</p>

      <p
        v-if="notice"
        class="mt-4 rounded-lg border px-3 py-2 text-sm"
        :class="notice.type === 'error'
          ? 'border-[color-mix(in_srgb,var(--status-bad)_50%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_14%,var(--panel))]'
          : 'border-[color-mix(in_srgb,var(--status-good)_50%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))]'"
      >
        {{ notice.text }}
      </p>

      <div class="mt-6 flex min-h-12 items-center" ref="googleButtonRoot"></div>
      <p v-if="loading" class="mt-3 text-xs text-[var(--muted)]">Signing in...</p>
    </section>
  </main>
</template>
