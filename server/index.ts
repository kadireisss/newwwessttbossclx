import "dotenv/config";
import express, { type Request, Response, NextFunction } from "express";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";
import { createServer } from "http";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import compression from "compression";
import { pool } from "./db";
import { storage } from "./storage";
import { wsManager } from "./websocket";
import crypto from "crypto";

const PgStore = connectPgSimple(session);
const app = express();
const httpServer = createServer(app);

declare module "http" {
  interface IncomingMessage {
    rawBody: unknown;
  }
}

declare module "express-session" {
  interface SessionData {
    userId: number;
    username: string;
  }
}

// ============================================
// SECURITY HEADERS
// ============================================
app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use((_req, res, next) => {
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  next();
});

// ============================================
// COMPRESSION
// ============================================
app.use(compression());

// ============================================
// BODY PARSING
// ============================================
app.use(express.json({
  limit: "5mb",
  verify: (req, _res, buf) => { req.rawBody = buf; },
}));
app.use(express.urlencoded({ extended: false }));

// ============================================
// SESSION - PostgreSQL backed
// ============================================
const sessionSecret = process.env.SESSION_SECRET || crypto.randomBytes(48).toString('hex');
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
  console.warn("⚠️  WARNING: Set SESSION_SECRET env var (64+ chars) for production!");
}

app.use(session({
  store: new PgStore({
    pool: pool as any,
    tableName: "user_sessions",
    createTableIfMissing: true,
    pruneSessionInterval: 900, // 15 min
  }),
  secret: sessionSecret,
  name: "__sid",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production" && process.env.FORCE_INSECURE_COOKIE !== "true",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: "lax",
  },
}));

// ============================================
// REQUEST LOGGING
// ============================================
const isProd = process.env.NODE_ENV === "production";

export function log(message: string, source = "express") {
  if (isProd) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), src: source, msg: message }));
  } else {
    const time = new Date().toLocaleTimeString("en-US", {
      hour: "numeric", minute: "2-digit", second: "2-digit", hour12: true,
    });
    console.log(`${time} [${source}] ${message}`);
  }
}

app.use((req, res, next) => {
  const start = Date.now();
  const reqId = crypto.randomBytes(8).toString('hex');

  res.on("finish", () => {
    const duration = Date.now() - start;
    if (req.path.startsWith("/api")) {
      log(`${reqId} ${req.method} ${req.path} ${res.statusCode} ${duration}ms`);
    }
  });

  next();
});

// ============================================
// HEALTH CHECK
// ============================================
app.get("/api/health", async (_req, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ status: "ok", uptime: process.uptime(), db: "connected" });
  } catch {
    res.status(503).json({ status: "error", db: "disconnected" });
  }
});

// ============================================
// STARTUP
// ============================================
(async () => {
  await registerRoutes(httpServer, app);

  // Error handler (FIXED: no throw)
  app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error(`[error] ${status}: ${message}`, isProd ? '' : err.stack);
    if (!res.headersSent) {
      res.status(status).json({ message });
    }
  });

  if (process.env.NODE_ENV === "production") {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  // WebSocket server'ı başlat
  wsManager.init(httpServer);
  
  // Passenger, Node.js'in http.Server.listen() çağrısını yakalar
  // ve kendi Unix soketine yönlendirir. Uyumluluğu bozmamak için
  // basit listen(port, host, callback) formatını kullanıyoruz.
  const port = parseInt(process.env.PORT || "3000", 10) || 3000;
  
  httpServer.listen(port, "0.0.0.0", () => {
    log(`BOSS Cloaker v3.2 serving on port ${port}`);
  });

  // Cleanup jobs
  const runCleanup = () => storage.runCleanup();
  setTimeout(runCleanup, 30_000); // 30s after startup
  setInterval(runCleanup, 60 * 60 * 1000); // Every hour

  // Graceful shutdown
  const shutdown = async (signal: string) => {
    log(`${signal} received, shutting down...`);
    wsManager.shutdown();
    httpServer.close(() => {
      pool.end().then(() => {
        log("Database pool closed");
        process.exit(0);
      });
    });
    setTimeout(() => {
      console.error("Forced shutdown after timeout");
      process.exit(1);
    }, 10_000);
  };

  process.on("SIGTERM", () => shutdown("SIGTERM"));
  process.on("SIGINT", () => shutdown("SIGINT"));
})();
