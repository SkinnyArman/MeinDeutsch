import { createI18n, useI18n } from "vue-i18n";
import { messages } from "./messages";

type Primitive = string | number | boolean | null | undefined;
export type MessageSchema = typeof messages.en;

type TranslationTree<T> = {
  [K in keyof T]: T[K] extends string
    ? (params?: Record<string, Primitive>) => string
    : T[K] extends Record<string, unknown>
      ? TranslationTree<T[K]>
      : (params?: Record<string, Primitive>) => string;
};

const buildTranslator = <T extends Record<string, unknown>>(
  translate: (key: string, params?: Record<string, Primitive>) => string,
  node: T,
  path: string[] = []
): TranslationTree<T> => {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(node)) {
    const nextPath = [...path, key];
    if (typeof value === "string") {
      result[key] = (params?: Record<string, Primitive>) => translate(nextPath.join("."), params);
      continue;
    }
    if (value && typeof value === "object") {
      result[key] = buildTranslator(translate, value as Record<string, unknown>, nextPath);
      continue;
    }
    result[key] = (params?: Record<string, Primitive>) => translate(nextPath.join("."), params);
  }
  return result as TranslationTree<T>;
};

export const i18n = createI18n({
  legacy: false,
  locale: "en",
  fallbackLocale: "en",
  messages
});

export const useLanguage = (): { t: TranslationTree<MessageSchema> } => {
  const { t: translate } = useI18n();
  const t = buildTranslator(translate, messages.en);
  return { t };
};

export { messages };
