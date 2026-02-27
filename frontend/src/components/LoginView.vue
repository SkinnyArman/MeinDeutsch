<script setup lang="ts">
import { onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { useLanguage } from "@/libs/i18n";
import type { ApiResponse } from "@/types/ApiTypes";
import { apiFetch } from "@/libs/http";
import { API_PATHS } from "@/config/api";
import { setSession, type SessionUser } from "../utils/auth";

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
const { t } = useLanguage();
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const googleButtonRoot = ref<HTMLElement | null>(null);
const notice = ref<{ type: "error" | "success"; text: string } | null>(null);
const loading = ref(false);

const setError = (text: string): void => {
  notice.value = { type: "error", text };
};

const handleCredential = async (response: GoogleCredentialResponse): Promise<void> => {
  loading.value = true;
  try {
    const res = await apiFetch(API_PATHS.authGoogle, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: response.credential })
    });
    const payload = (await res.json()) as ApiResponse<GoogleAuthResult>;
    if (!res.ok || !payload.success || !payload.data) {
      throw new Error(payload.message || t.login.signInFailed());
    }

    setSession(payload.data.token, payload.data.user);
    notice.value = { type: "success", text: t.login.success() };
    await router.replace("/daily-talk");
  } catch (error) {
    setError(error instanceof Error ? error.message : t.login.signInFailed());
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
      existing.addEventListener("error", () => reject(new Error(t.login.googleUnavailable())));
      return;
    }

    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(t.login.googleUnavailable()));
    document.head.appendChild(script);
  });

onMounted(async () => {
  if (!GOOGLE_CLIENT_ID) {
    setError(t.login.missingClientId());
    return;
  }

  try {
    await loadGoogleScript();
    if (!window.google || !googleButtonRoot.value) {
      throw new Error(t.login.googleUnavailable());
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
    setError(error instanceof Error ? error.message : t.login.signInFailed());
  }
});
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-[var(--content-bg)] px-4">
    <section class="w-full max-w-md rounded-2xl border border-[var(--line)] bg-[var(--panel)] p-6 shadow-[var(--surface-shadow)]">
      <h1 class="font-serif text-2xl font-semibold">{{ t.login.title() }}</h1>
      <p class="mt-2 text-sm text-[var(--muted)]">{{ t.login.subtitle() }}</p>

      <p
        v-if="notice"
        class="mt-4 rounded-lg border px-3 py-2 text-xs"
        :class="notice.type === 'error'
          ? 'border-[color-mix(in_srgb,var(--status-bad)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-bad)_14%,var(--panel))]'
          : 'border-[color-mix(in_srgb,var(--status-good)_45%,var(--line))] bg-[color-mix(in_srgb,var(--status-good)_14%,var(--panel))]'
        "
      >
        {{ notice.text }}
      </p>

      <div class="mt-5 flex flex-col gap-3">
        <div ref="googleButtonRoot" class="w-full" />
        <p v-if="loading" class="text-xs text-[var(--muted)]">{{ t.common.loading() }}</p>
      </div>
    </section>
  </main>
</template>
