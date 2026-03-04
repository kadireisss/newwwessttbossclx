import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "../shared/schema";

const { Pool } = pg;

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL must be set. Did you forget to provision a database?");
}

const isServerless = !process.env.PORT && process.env.VERCEL === "1";

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: isServerless ? 5 : 20,
  idleTimeoutMillis: isServerless ? 10_000 : 30_000,
  connectionTimeoutMillis: 5_000,
  keepAlive: !isServerless,
});

pool.on("error", (err) => {
  console.error("[db] Pool error:", err.message);
});

export const db = drizzle(pool, { schema });
