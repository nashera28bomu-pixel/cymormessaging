import "dotenv/config";
import { z } from "zod";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  APP_URL: z.string().url(),
  FRONTEND_URL: z.string().url(),
  API_URL: z.string().url(),

  MONGODB_URI: z.string().min(1, "MONGODB_URI is required"),

  JWT_SECRET: z.string().min(16, "JWT_SECRET must be at least 16 characters"),
  JWT_REFRESH_SECRET: z.string().min(16, "JWT_REFRESH_SECRET must be at least 16 characters"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),

  META_APP_ID: z.string().optional().default(""),
  META_APP_SECRET: z.string().optional().default(""),
  META_GRAPH_API_VERSION: z.string().default("v20.0"),
  META_VERIFY_TOKEN: z.string().optional().default(""),
  META_SYSTEM_USER_ACCESS_TOKEN: z.string().optional().default(""),
  META_CONFIGURATION_ID: z.string().optional().default(""),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(""),
  CLOUDINARY_API_KEY: z.string().optional().default(""),
  CLOUDINARY_API_SECRET: z.string().optional().default(""),

  REDIS_URL: z.string().default("redis://localhost:6379"),

  SMTP_HOST: z.string().optional().default(""),
  SMTP_PORT: z.coerce.number().optional().default(587),
  SMTP_USER: z.string().optional().default(""),
  SMTP_PASSWORD: z.string().optional().default(""),
  EMAIL_FROM: z.string().optional().default("Cymor Messaging <no-reply@cymormessaging.com>"),

  CREDENTIALS_ENCRYPTION_KEY: z.string().min(32, "CREDENTIALS_ENCRYPTION_KEY must be at least 32 characters"),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  // Fail fast and loud - a misconfigured SaaS backend must never boot silently.
  console.error("Invalid environment configuration:");
  console.error(parsed.error.flatten().fieldErrors);
  process.exit(1);
}

export const env = parsed.data;

export const isProduction = env.NODE_ENV === "production";
export const isDevelopment = env.NODE_ENV === "development";
export const isTest = env.NODE_ENV === "test";

export const metaIsConfigured = Boolean(
  env.META_APP_ID && env.META_APP_SECRET && env.META_SYSTEM_USER_ACCESS_TOKEN
);

export const cloudinaryIsConfigured = Boolean(
  env.CLOUDINARY_CLOUD_NAME && env.CLOUDINARY_API_KEY && env.CLOUDINARY_API_SECRET
);
