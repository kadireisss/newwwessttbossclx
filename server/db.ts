import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  console.error("WARNING: DATABASE_URL is not set. Database operations will fail.");
}

const isServerless = !process.env.PORT && process.env.VERCEL === "1";
const connectionString = process.env.DATABASE_URL || "postgresql://localhost:5432/placeholder";

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
