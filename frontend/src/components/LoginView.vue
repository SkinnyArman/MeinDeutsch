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
  <main class="relative flex min-h-[100dvh] items-center justify-center overflow-hidden px-4">
    <!-- Decorative gradient orbs -->
    <div
      class="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full opacity-30 blur-3xl"
      style="background-image: linear-gradient(135deg, var(--accent), var(--accent-strong))"
    />
    <div
      class="pointer-events-none absolute -bottom-40 -right-20 h-80 w-80 rounded-full opacity-20 blur-3xl"
      style="background-image: linear-gradient(135deg, var(--accent-strong), var(--accent))"
    />

    <section class="card relative w-full max-w-md animate-fade-up p-8 sm:p-10">
      <div
        class="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl text-xl font-bold text-white shadow-[0_8px_24px_color-mix(in_srgb,var(--accent)_45%,transparent)]"
        style="background-image: linear-gradient(135deg, var(--accent), var(--accent-strong))"
      >
        M
      </div>
      <h1 class="mt-6 text-center font-serif text-3xl font-semibold tracking-tight">MeinDeutsch</h1>
      <p class="mt-2 text-center text-sm text-[var(--muted)]">{{ t.shell.tagline() }}</p>
      <p class="mt-6 text-center text-sm text-[var(--muted)]">{{ t.login.subtitle() }}</p>

      <p v-if="notice" class="mt-5" :class="notice.type === 'error' ? 'notice-error' : 'notice-success'">
        {{ notice.text }}
      </p>

      <div class="mt-6 flex flex-col items-center gap-3">
        <div ref="googleButtonRoot" class="w-full [&>div]:flex [&>div]:justify-center" />
        <p v-if="loading" class="text-xs text-[var(--muted)]">{{ t.common.loading() }}</p>
      </div>
    </section>
  </main>
</template>
