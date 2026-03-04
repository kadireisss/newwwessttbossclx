import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import compression from "compression";
import helmet from "helmet";
import { isDatabaseConfigured, pool } from "./db";
import { registerRoutes } from "./routes";
import { enforceSameOrigin, getSessionSecret } from "./security";

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
  }
}

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", true);

app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  }),
);

app.use(compression());
app.use(express.json({ limit: "5mb" }));
app.use(express.urlencoded({ extended: false }));
app.use(enforceSameOrigin);

if (!isDatabaseConfigured) {
  app.use((_req: Request, res: Response) => {
    res.status(500).json({
      error: "DATABASE_URL environment variable is missing or invalid",
      hint: "Go to Vercel Project Settings -> Environment Variables and add a valid DATABASE_URL",
    });
  });
} else {
  const PgStore = connectPgSimple(session);
  const secureCookies =
    process.env.NODE_ENV === "production" &&
    process.env.FORCE_INSECURE_COOKIE !== "true";

  let sessionSecret: string | null = null;
  try {
    sessionSecret = getSessionSecret();
  } catch (error: any) {
    console.error("[session-config]", error?.message || error);
  }

  if (!sessionSecret) {
    app.use((_req: Request, res: Response) => {
      res.status(500).json({
        error: "Session is not configured securely",
        hint: "Set SESSION_SECRET (minimum 32 chars) in environment variables",
      });
    });
  } else {
    const sessionMiddleware = session({
      store: new PgStore({
        pool: pool as any,
        tableName: "user_sessions",
        createTableIfMissing: true,
        pruneSessionInterval: 60,
        errorLog: (err: Error) => {
          console.error("[session-store]", err.message);
        },
      }),
      secret: sessionSecret,
      name: "__sid",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: secureCookies,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000,
        sameSite: "strict",
      },
    });

    // Avoid DB-backed session lookup on public pages like /maintenance and /r/:slug.
    app.use("/api", sessionMiddleware);
  }

  app.get("/api/health", async (_req: Request, res: Response) => {
    try {
      await pool.query("SELECT 1");
      const schemaCheck = await pool.query(
        "SELECT to_regclass('public.users') AS users_table",
      );
      const schemaReady = Boolean(schemaCheck.rows?.[0]?.users_table);
      if (!schemaReady) {
        return res.status(503).json({
          status: "error",
          db: "connected",
          schema: "missing",
          message: "Database schema is missing. Run `npm run db:push` against production DATABASE_URL.",
        });
      }
      res.json({ status: "ok", db: "connected", schema: "ready" });
    } catch (e: any) {
      res.status(503).json({ status: "error", db: "disconnected", message: e?.message });
    }
  });

  try {
    void registerRoutes(null as any, app);
  } catch (e: any) {
    console.error("[routes-init]", e?.message || e);
    app.use((_req: Request, res: Response) => {
      res.status(500).json({ message: "Route initialization failed" });
    });
  }
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
