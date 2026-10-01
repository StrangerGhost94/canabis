import "server-only";
import { z } from "zod";

const Env = z.object({
  DATABASE_URL: z.string().url(),
  SESSION_SECRET: z.string().min(32, "SESSION_SECRET must be at least 32 characters"),
  HASH_SALT: z.string().min(8),
  APP_URL: z.string().url().default("http://localhost:3000"),
  UPLOAD_DIR: z.string().default("./storage/uploads"),
  NODE_ENV: z.string().default("development"),
});

export const env = Env.parse(process.env);
export const isProd = env.NODE_ENV === "production";
