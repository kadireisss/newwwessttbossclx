import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import compression from "compression";
import { pool } from "./db";
import { registerRoutes } from "./routes";
import crypto from "crypto";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
  }
}

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((_req: Request, res: Response, next: NextFunction) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false }));

if (!process.env.DATABASE_URL) {
  app.use((_req: Request, res: Response) => {
    res.status(500).json({
      error: "DATABASE_URL environment variable is not set",
      hint: "Go to Vercel → Project Settings → Environment Variables and add DATABASE_URL",
    });
  });
} else {
  const PgStore = connectPgSimple(session);
  const sessionSecret =
    process.env.SESSION_SECRET || crypto.randomBytes(48).toString("hex");

  app.use(
    session({
      store: new PgStore({
        pool: pool as any,
        tableName: "user_sessions",
        createTableIfMissing: true,
        pruneSessionInterval: false,
        errorLog: (err: Error) => {
          console.error("[session-store]", err.message);
        },
      }),
      secret: sessionSecret,
      name: "__sid",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.FORCE_INSECURE_COOKIE !== "true",
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "lax",
      },
    }),
  );

  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      await pool.query("SELECT 1");
      res.json({ status: "ok", db: "connected" });
    } catch (e: any) {
      res.status(503).json({ status: "error", db: "disconnected", message: e?.message });
    }
  });

  void registerRoutes(null as any, app);
}

app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  const status = err.status || err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  console.error(`[error] ${status}: ${message}`);
  if (!res.headersSent) {
    res.status(status).json({ message });
  }
});

export default app;
