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
  GOOGLE_CLIENT_ID: z.string().min(1, "GOOGLE_CLIENT_ID is required"),
  GOOGLE_AUTHORIZED_EMAILS: z.string().default("armanwithamini@gmail.com"),
  OPENAI_API_KEY: z.string().optional(),
  OPENAI_MODEL: z.string().default("gpt-4o-mini"),
  AI_FALLBACK_ENABLED: z.preprocess(parseBooleanFromEnv, z.boolean().default(false))
});

export const env = schema.parse(process.env);
