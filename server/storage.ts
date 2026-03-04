import { db } from "./db";
import {
  users, domains, landingPages, accessLogs, ipBlacklist, userAgentBlacklist, settings, rateLimits, challengeTokens,
  type User, type Domain, type LandingPage, type AccessLog, type IpBlacklist, type UserAgentBlacklist,
  type CreateDomainRequest, type UpdateDomainRequest, type CreateLandingPageRequest
} from "../shared/schema";
import { eq, desc, and, gte, sql, lt, count } from "drizzle-orm";
import crypto from "crypto";
import { buildUaWildcardRegex, extractUaPatternTokens, isIpInCidr } from "./security";

// ============================================
// CACHE SYSTEM
// ============================================
class CacheStore<T> {
  private data: T | null = null;
  private lastFetch = 0;
  private ttlMs: number;

  constructor(ttlSeconds: number) {
    this.ttlMs = ttlSeconds * 1000;
  }

  get(): T | null {
    if (this.data && Date.now() - this.lastFetch < this.ttlMs) return this.data;
    return null;
  }

  set(value: T): void {
    this.data = value;
    this.lastFetch = Date.now();
  }

  invalidate(): void {
    this.data = null;
    this.lastFetch = 0;
  }
}

export class DatabaseStorage {
  // Caches
  private ipBlacklistCache = new CacheStore<{ exact: Set<string>; cidrs: string[] }>(30); // 30s
  private uaBlacklistCache = new CacheStore<{
    tokenSets: { token: string; wildcardRegex: RegExp | null }[][];
  }>(60); // 60s

  // ============================================
  // AUTH
  // ============================================
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async changePassword(userId: number, newHashedPassword: string): Promise<void> {
    await db.update(users).set({ password: newHashedPassword }).where(eq(users.id, userId));
  }

  // ============================================
  // SETTINGS
  // ============================================
  async getSetting(key: string): Promise<string | null> {
    const [entry] = await db.select().from(settings).where(eq(settings.key, key));
    return entry?.value || null;
  }

  async getSettings(): Promise<Record<string, string>> {
    const all = await db.select().from(settings);
    const result: Record<string, string> = {};
    for (const s of all) result[s.key] = s.value || '';
    return result;
  }

  async setSetting(key: string, value: string): Promise<void> {
    const [existing] = await db.select().from(settings).where(eq(settings.key, key));
    if (existing) {
      await db.update(settings).set({ value, updatedAt: new Date() }).where(eq(settings.key, key));
    } else {
      await db.insert(settings).values({ key, value });
    }
  }

  async setSettings(entries: Record<string, string>): Promise<void> {
    for (const [key, value] of Object.entries(entries)) {
      await this.setSetting(key, value);
    }
  }

  // ============================================
  // STATS - SQL COUNT (no OOM risk!)
  // ============================================
  async getStats(): Promise<{ totalVisits: number; botVisits: number; realVisits: number; todayVisits: number; todayBots: number; todayReal: number }> {
    // Total counts via SQL aggregation
    const [totalResult] = await db.select({ count: count() }).from(accessLogs);
    const [botResult] = await db.select({ count: count() }).from(accessLogs).where(eq(accessLogs.isBot, true));
    
    const totalVisits = totalResult?.count ?? 0;
    const botVisits = botResult?.count ?? 0;
    const realVisits = totalVisits - botVisits;

    // Today's counts
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    
    const [todayTotal] = await db.select({ count: count() }).from(accessLogs).where(gte(accessLogs.createdAt, todayStart));
    const [todayBot] = await db.select({ count: count() }).from(accessLogs).where(and(gte(accessLogs.createdAt, todayStart), eq(accessLogs.isBot, true)));
    
    const todayVisits = todayTotal?.count ?? 0;
    const todayBots = todayBot?.count ?? 0;
    const todayReal = todayVisits - todayBots;

    return { totalVisits, botVisits, realVisits, todayVisits, todayBots, todayReal };
  }

  // ============================================
  // LOG MANAGEMENT
  // ============================================
  async clearOldLogs(daysOld: number): Promise<void> {
    const cutoff = new Date(Date.now() - daysOld * 24 * 60 * 60 * 1000);
    await db.delete(accessLogs).where(lt(accessLogs.createdAt, cutoff));
  }

  async clearAllLogs(): Promise<void> {
    await db.delete(accessLogs);
  }

  async resetStats(): Promise<void> {
    await db.delete(accessLogs);
    await db.delete(rateLimits);
    await db.delete(challengeTokens);
    // Reset domain counters
    await db.update(domains).set({ totalClicks: 0, botClicks: 0, realClicks: 0 });
  }

  // ============================================
  // CLEANUP JOBS
  // ============================================
  async cleanupExpiredTokens(): Promise<number> {
    await db.delete(challengeTokens).where(lt(challengeTokens.expiresAt, new Date()));
    return 0;
  }

  async cleanupOldRateLimits(): Promise<void> {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000); // 24 hours
    await db.delete(rateLimits).where(lt(rateLimits.lastClick, cutoff));
  }

  async runCleanup(): Promise<void> {
    try {
      await this.cleanupExpiredTokens();
      await this.cleanupOldRateLimits();
      console.log(`[cleanup] Expired tokens and old rate limits cleaned`);
    } catch (e) {
      console.error('[cleanup] Error:', e);
    }
  }

  // ============================================
  // DOMAINS
  // ============================================
  async getDomains(): Promise<Domain[]> {
    return await db.select().from(domains).orderBy(desc(domains.createdAt));
  }

  async getDomain(id: number): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.id, id));
    return domain;
  }

  async getDomainByName(name: string): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.domain, name));
    return domain;
  }

  async getDomainBySlug(slug: string): Promise<Domain | undefined> {
    const [domain] = await db.select().from(domains).where(eq(domains.slug, slug));
    return domain;
  }

  private generateSlug(): string {
    return crypto.randomBytes(4).toString('hex'); // 8 char hex
  }

  async createDomain(insertDomain: CreateDomainRequest): Promise<Domain> {
    const slug = this.generateSlug();
    const [domain] = await db.insert(domains).values({ ...insertDomain, slug }).returning();
    return domain;
  }

  async updateDomain(id: number, update: UpdateDomainRequest): Promise<Domain> {
    const [domain] = await db.update(domains).set(update).where(eq(domains.id, id)).returning();
    return domain;
  }

  async deleteDomain(id: number): Promise<void> {
    await db.delete(accessLogs).where(eq(accessLogs.domainId, id));
    await db.delete(rateLimits).where(eq(rateLimits.domainId, id));
    await db.delete(challengeTokens).where(eq(challengeTokens.domainId, id));
    await db.delete(domains).where(eq(domains.id, id));
  }

  // Increment domain click counters
  async incrementDomainClicks(domainId: number, isBot: boolean): Promise<void> {
    if (isBot) {
      await db.update(domains).set({
        totalClicks: sql`${domains.totalClicks} + 1`,
        botClicks: sql`${domains.botClicks} + 1`,
      }).where(eq(domains.id, domainId));
    } else {
      await db.update(domains).set({
        totalClicks: sql`${domains.totalClicks} + 1`,
        realClicks: sql`${domains.realClicks} + 1`,
      }).where(eq(domains.id, domainId));
    }
  }

  // ============================================
  // LANDING PAGES
  // ============================================
  async getLandingPages(): Promise<LandingPage[]> {
    return await db.select().from(landingPages).orderBy(desc(landingPages.createdAt));
  }

  async getLandingPage(id: number): Promise<LandingPage | undefined> {
    const [page] = await db.select().from(landingPages).where(eq(landingPages.id, id));
    return page;
  }

  async createLandingPage(insertPage: CreateLandingPageRequest): Promise<LandingPage> {
    const [page] = await db.insert(landingPages).values(insertPage).returning();
    return page;
  }

  async updateLandingPage(id: number, update: Partial<CreateLandingPageRequest>): Promise<LandingPage> {
    const [page] = await db.update(landingPages).set(update).where(eq(landingPages.id, id)).returning();
    return page;
  }

  async deleteLandingPage(id: number): Promise<void> {
    await db.delete(landingPages).where(eq(landingPages.id, id));
  }

  // ============================================
  // ACCESS LOGS
  // ============================================
  async createAccessLog(log: typeof accessLogs.$inferInsert): Promise<AccessLog> {
    const [newLog] = await db.insert(accessLogs).values(log).returning();
    return newLog;
  }

  async getAccessLogs(limit = 100): Promise<AccessLog[]> {
    return await db.select().from(accessLogs).orderBy(desc(accessLogs.createdAt)).limit(limit);
  }

  async getAccessLogsSince(since: Date, limit = 20): Promise<AccessLog[]> {
    return await db.select().from(accessLogs)
      .where(gte(accessLogs.createdAt, since))
      .orderBy(desc(accessLogs.createdAt))
      .limit(limit);
  }

  // ============================================
  // BLACKLISTS (with caching)
  // ============================================
  async isIpBlacklisted(ip: string): Promise<boolean> {
    let cached = this.ipBlacklistCache.get();
    if (!cached) {
      const entries = await db.select({ ipAddress: ipBlacklist.ipAddress }).from(ipBlacklist);
      const exact = new Set<string>();
      const cidrs: string[] = [];

      for (const entry of entries) {
        const value = entry.ipAddress.trim();
        if (!value) continue;
        if (value.includes("/")) cidrs.push(value);
        else exact.add(value);
      }

      cached = { exact, cidrs };
      this.ipBlacklistCache.set(cached);
    }

    if (cached.exact.has(ip)) return true;
    return cached.cidrs.some((cidr) => isIpInCidr(ip, cidr));
  }

  async getIpBlacklist(): Promise<IpBlacklist[]> {
    return await db.select().from(ipBlacklist).orderBy(desc(ipBlacklist.addedAt));
  }

  async addToIpBlacklist(ip: string, reason?: string): Promise<IpBlacklist> {
    const [entry] = await db.insert(ipBlacklist).values({ ipAddress: ip, reason }).returning();
    this.ipBlacklistCache.invalidate();
    return entry;
  }

  async removeFromIpBlacklist(id: number): Promise<void> {
    await db.delete(ipBlacklist).where(eq(ipBlacklist.id, id));
    this.ipBlacklistCache.invalidate();
  }

  async isUaBlacklisted(userAgent: string): Promise<boolean> {
    let cached = this.uaBlacklistCache.get();
    if (!cached) {
      const entries = await db.select({ pattern: userAgentBlacklist.pattern }).from(userAgentBlacklist);
      const tokenSets = entries
        .map((entry) =>
          extractUaPatternTokens(entry.pattern).map((token) => ({
            token,
            wildcardRegex:
              token.includes("*") || token.includes("?")
                ? buildUaWildcardRegex(token)
                : null,
          })),
        )
        .filter((tokens) => tokens.length > 0);

      cached = { tokenSets };
      this.uaBlacklistCache.set(cached);
    }

    const normalizedUA = userAgent.toLowerCase();
    return cached.tokenSets.some((tokens) =>
      tokens.some((matcher) =>
        matcher.wildcardRegex
          ? matcher.wildcardRegex.test(normalizedUA)
          : normalizedUA.includes(matcher.token),
      ),
    );
  }

  async getUaBlacklist(): Promise<UserAgentBlacklist[]> {
    return await db.select().from(userAgentBlacklist).orderBy(desc(userAgentBlacklist.addedAt));
  }

  async addToUaBlacklist(pattern: string, reason?: string): Promise<UserAgentBlacklist> {
    const [entry] = await db.insert(userAgentBlacklist).values({ pattern, reason }).returning();
    this.uaBlacklistCache.invalidate();
    return entry;
  }

  async removeFromUaBlacklist(id: number): Promise<void> {
    await db.delete(userAgentBlacklist).where(eq(userAgentBlacklist.id, id));
    this.uaBlacklistCache.invalidate();
  }

  // ============================================
  // RATE LIMITING (atomic increment via SQL)
  // ============================================
  async checkRateLimit(domainId: number, ip: string, maxClicks: number, windowSeconds: number): Promise<boolean> {
    if (maxClicks <= 0) return true;
    const windowStart = new Date(Date.now() - windowSeconds * 1000);
    const [entry] = await db.select()
      .from(rateLimits)
      .where(and(
        eq(rateLimits.domainId, domainId),
        eq(rateLimits.ipAddress, ip),
        gte(rateLimits.firstClick, windowStart)
      ));
    if (!entry) return true;
    return (entry.clickCount || 0) < maxClicks;
  }

  async incrementRateLimit(domainId: number, ip: string, _windowSeconds: number): Promise<void> {
    try {
      await db.insert(rateLimits).values({ domainId, ipAddress: ip, clickCount: 1 });
    } catch {
      await db.update(rateLimits)
        .set({
          clickCount: sql`${rateLimits.clickCount} + 1`,
          lastClick: new Date(),
        })
        .where(and(eq(rateLimits.domainId, domainId), eq(rateLimits.ipAddress, ip)));
    }
  }

  // ============================================
  // JS CHALLENGE TOKENS
  // ============================================
  async createChallengeToken(domainId: number, ip: string, ua: string): Promise<string> {
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    await db.insert(challengeTokens).values({
      token, domainId, ipAddress: ip, userAgent: ua, verified: false, expiresAt,
    });
    return token;
  }

  async verifyChallengeToken(token: string, ip: string, domainId: number, ua: string): Promise<boolean> {
    const [entry] = await db.select()
      .from(challengeTokens)
      .where(and(
        eq(challengeTokens.token, token),
        eq(challengeTokens.ipAddress, ip),
        eq(challengeTokens.domainId, domainId),
        gte(challengeTokens.expiresAt, new Date())
      ));

    if (!entry || entry.verified || entry.userAgent !== ua) return false;

    // Mark as consumed and delete
    await db.delete(challengeTokens).where(eq(challengeTokens.id, entry.id));
    return true;
  }
}

export const storage = new DatabaseStorage();
