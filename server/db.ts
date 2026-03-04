import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;
const PLACEHOLDER_DATABASE_URL = "postgresql://postgres:postgres@127.0.0.1:5432/postgres";

const isServerless = !process.env.PORT && process.env.VERCEL === "1";
const rawDatabaseUrl = process.env.DATABASE_URL?.trim();

function normalizeDatabaseUrl(url?: string): string {
  if (!url) return PLACEHOLDER_DATABASE_URL;

  const normalized = url.replace(/^['"]|['"]$/g, "");
  try {
    new URL(normalized);
    return normalized;
  } catch {
    console.error("[db] Invalid DATABASE_URL format. Falling back to placeholder URL.");
    return PLACEHOLDER_DATABASE_URL;
  }
}

const connectionString = normalizeDatabaseUrl(rawDatabaseUrl);
export const isDatabaseConfigured = connectionString !== PLACEHOLDER_DATABASE_URL;

if (!isDatabaseConfigured) {
  console.error("WARNING: DATABASE_URL is missing/invalid. Database operations will fail.");
}

const needsSsl =
  connectionString.includes("sslmode=require") ||
  connectionString.includes("neon.tech") ||
  connectionString.includes("supabase.co") ||
  connectionString.includes("aivencloud.com") ||
  isServerless;

export const pool = new Pool({
  connectionString,
  max: isServerless ? 5 : 20,
  idleTimeoutMillis: isServerless ? 10_000 : 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: !isServerless,
  ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
});

pool.on("error", (err) => {
  console.error("[db] Pool error:", err.message);
});

export const db = drizzle(pool, { schema });
