import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const envSchema = z.object({
  PORT: z.string().default("5002").transform((val) => parseInt(val, 10)),
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  CORS_ORIGIN: z.string().default("http://localhost:5173"),
  DATABASE_URL: z.string().default("postgresql://postgres:postgres@localhost:5432/kibo360_hub?schema=public"),
  JWT_ACCESS_SECRET: z.string().default("kibo360-livexpert-access-token-secret-2026"),
  JWT_REFRESH_SECRET: z.string().default("kibo360-livexpert-refresh-token-secret-2026"),
  JWT_ACCESS_EXPIRES_IN: z.string().default("15m"),
  JWT_REFRESH_EXPIRES_IN: z.string().default("30d"),
  FRONTEND_URL: z.string().default("http://localhost:5173"),
  SUPER_ADMIN_EMAIL: z.string().email().default("admin@livexpert.in"),
  TOTP_ENCRYPTION_KEY: z.string().optional(),
  COMPANY_TIMEZONE: z.string().default("Asia/Kolkata"),
  RATE_LIMIT_WINDOW_MS: z.string().default("900000").transform((val) => parseInt(val, 10)), // 15 mins
  RATE_LIMIT_MAX_REQUESTS: z.string().default("1000").transform((val) => parseInt(val, 10)),
  // Number of reverse proxies in front of the API (0 when exposed directly)
  TRUST_PROXY: z.string().default("1").transform((val) => parseInt(val, 10)),
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
}).refine((data) => {
  return data.NODE_ENV !== "production" || /^[0-9a-fA-F]{64}$/.test(data.TOTP_ENCRYPTION_KEY || "");
}, {
  message: "TOTP_ENCRYPTION_KEY must be a unique 64-character hexadecimal key in production.",
  path: ["TOTP_ENCRYPTION_KEY"],
});

const parsedEnv = envSchema.safeParse(process.env);

if (!parsedEnv.success) {
  console.error("❌ Invalid environment variables:", parsedEnv.error.format());
  process.exit(1);
}

export const env = parsedEnv.data;
