import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5000").transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/kibo360_hub?schema=public"),
  JWT_ACCESS_SECRET: z.string().default("kibo360-livexpert-access-token-secret-2026"),
  JWT_REFRESH_SECRET: z.string().default("kibo360-livexpert-refresh-token-secret-2026"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("7d"),
  SMTP_HOST: z.string().optional(),
  SMTP_PORT: z.string().optional().transform((val) => (val ? parseInt(val, 10) : undefined)),
  SMTP_USER: z.string().optional(),
  SMTP_PASS: z.string().optional(),
  SMTP_FROM: z.string().default("Livexpert Security <security@livexpert.in>"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  COMPANY_TIMEZONE: z.string().default("Asia/Kolkata"),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform((val) => parseInt(val, 10)), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.string().default("1000").transform((val) => parseInt(val, 10)),
}).refine((data) => {
  if (data.NODE_ENV === "production") {
    if (data.JWT_ACCESS_SECRET === "kibo360-livexpert-access-token-secret-2026") {
      return false;
    }
    if (data.JWT_REFRESH_SECRET === "kibo360-livexpert-refresh-token-secret-2026") {
      return false;
    }
  }
  return true;
}, {
  message: "In production, secure JWT_ACCESS_SECRET and JWT_REFRESH_SECRET must be explicitly provided and cannot use default test secrets.",
  path: ["JWT_ACCESS_SECRET"],
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;