import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const parseBooleanFromEnv = (value: unknown): boolean => {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value !== "string") {
    return false;
  }

  return value.toLowerCase() === "true";
};

const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().int().min(1).max(65535).default(4000),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  APP_JWT_SECRET: z.string().min(16, "APP_JWT_SECRET must be at least 16 characters"),
  ALLOWED_ORIGINS: z.string().optional(),
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_AUTHORIZED_EMAILS: z.string().default("armanwithamini@gmail.com"),
  // Optional Google-free fallback login for whitelisted emails (useful when
  // Google endpoints are blocked by network/region). Empty = disabled.
  AUTH_PASSWORD: z
    .string()
    .min(8, "AUTH_PASSWORD must be at least 8 characters")
    .optional()
    .or(z.literal("").transform(() => undefined)),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  // Smarter, pricier model for low-volume high-stakes tasks (e.g. the level
  // placement assessment). Falls back to OPENAI_MODEL behavior if unset.
  OPENAI_MODEL_SMART: z.string().default("gpt-4.1"),
  AI_FALLBACK_ENABLED: z.preprocess(parseBooleanFromEnv, z.boolean().default(false))
});

export const env = schema.parse(process.env);
