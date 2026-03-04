import { pgTable, text, serial, integer, boolean, timestamp, jsonb, varchar } from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

const safeHttpUrlSchema = z
  .string()
  .trim()
  .url()
  .max(2048)
  .refine((value) => {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch {
      return false;
    }
  }, "Only http/https URLs are allowed");

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  email: text("email"),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const landingPages = pgTable("landing_pages", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  htmlContent: text("html_content").notNull(),
  cssContent: text("css_content"),
  jsContent: text("js_content"),
  thumbnail: text("thumbnail"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const domains = pgTable("domains", {
  id: serial("id").primaryKey(),
  domain: text("domain").notNull().unique(),
  slug: text("slug").unique(),
  targetUrl: text("target_url").notNull(),
  landingPageId: integer("landing_page_id").references(() => landingPages.id),
  redirectEnabled: boolean("redirect_enabled").default(true),
  detectionLevel: text("detection_level").default("high"),
  status: text("status").default("active"),
  allowedCountries: text("allowed_countries"),
  blockedCountries: text("blocked_countries"),
  blockDirectAccess: boolean("block_direct_access").default(false),
  blockedPlatforms: text("blocked_platforms").default('google,facebook,bing,tiktok'),
  jsChallenge: boolean("js_challenge").default(false),
  redirectMode: text("redirect_mode").default("302"),
  activeHours: text("active_hours"),
  activeDays: text("active_days"),
  timezone: text("timezone").default("Europe/Istanbul"),
  maxClicksPerIp: integer("max_clicks_per_ip").default(0),
  rateLimitWindow: integer("rate_limit_window").default(3600),
  allowMobile: boolean("allow_mobile").default(true),
  allowDesktop: boolean("allow_desktop").default(true),
  // NEW: Click tracking
  totalClicks: integer("total_clicks").default(0),
  botClicks: integer("bot_clicks").default(0),
  realClicks: integer("real_clicks").default(0),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const rateLimits = pgTable("rate_limits", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => domains.id),
  ipAddress: text("ip_address").notNull(),
  clickCount: integer("click_count").default(1),
  firstClick: timestamp("first_click").defaultNow(),
  lastClick: timestamp("last_click").defaultNow(),
});

export const challengeTokens = pgTable("challenge_tokens", {
  id: serial("id").primaryKey(),
  token: text("token").notNull().unique(),
  domainId: integer("domain_id").references(() => domains.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  verified: boolean("verified").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  expiresAt: timestamp("expires_at"),
});

export const ipBlacklist = pgTable("ip_blacklist", {
  id: serial("id").primaryKey(),
  ipAddress: text("ip_address").notNull(),
  reason: text("reason"),
  addedAt: timestamp("added_at").defaultNow(),
});

export const userAgentBlacklist = pgTable("user_agent_blacklist", {
  id: serial("id").primaryKey(),
  pattern: text("pattern").notNull(),
  reason: text("reason"),
  addedAt: timestamp("added_at").defaultNow(),
});

export const accessLogs = pgTable("access_logs", {
  id: serial("id").primaryKey(),
  domainId: integer("domain_id").references(() => domains.id),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  referer: text("referer"),
  country: text("country"),
  isBot: boolean("is_bot"),
  botScore: integer("bot_score"),
  botReasons: text("bot_reasons"),
  destination: text("destination"),
  clickId: text("click_id"), // NEW: track gclid/fbclid without scoring
  headers: jsonb("headers"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  key: text("key").unique().notNull(),
  value: text("value"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// === RELATIONS ===
export const domainsRelations = relations(domains, ({ one, many }) => ({
  landingPage: one(landingPages, {
    fields: [domains.landingPageId],
    references: [landingPages.id],
  }),
  logs: many(accessLogs),
}));

export const landingPagesRelations = relations(landingPages, ({ many }) => ({
  domains: many(domains),
}));

export const accessLogsRelations = relations(accessLogs, ({ one }) => ({
  domain: one(domains, {
    fields: [accessLogs.domainId],
    references: [domains.id],
  }),
}));

// === SCHEMAS ===
export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true, lastLogin: true });
export const insertLandingPageSchema = createInsertSchema(landingPages).omit({ id: true, createdAt: true, updatedAt: true });
export const insertDomainSchema = createInsertSchema(domains)
  .omit({ id: true, createdAt: true, updatedAt: true, totalClicks: true, botClicks: true, realClicks: true })
  .extend({
    targetUrl: safeHttpUrlSchema,
  });
export const insertIpBlacklistSchema = createInsertSchema(ipBlacklist).omit({ id: true, addedAt: true });
export const insertUABlacklistSchema = createInsertSchema(userAgentBlacklist)
  .omit({ id: true, addedAt: true })
  .extend({
    pattern: z.string().trim().min(1).max(128),
  });
export const insertSettingsSchema = createInsertSchema(settings).omit({ id: true, updatedAt: true });
export const insertRateLimitSchema = createInsertSchema(rateLimits).omit({ id: true, firstClick: true, lastClick: true });
export const insertChallengeTokenSchema = createInsertSchema(challengeTokens).omit({ id: true, createdAt: true });

// === TYPES ===
export type User = typeof users.$inferSelect;
export type LandingPage = typeof landingPages.$inferSelect;
export type Domain = typeof domains.$inferSelect;
export type AccessLog = typeof accessLogs.$inferSelect;
export type IpBlacklist = typeof ipBlacklist.$inferSelect;
export type UserAgentBlacklist = typeof userAgentBlacklist.$inferSelect;
export type Setting = typeof settings.$inferSelect;
export type RateLimit = typeof rateLimits.$inferSelect;
export type ChallengeToken = typeof challengeTokens.$inferSelect;

export type LoginRequest = { username: string; password: string };
export type CreateDomainRequest = z.infer<typeof insertDomainSchema>;
export type UpdateDomainRequest = Partial<CreateDomainRequest>;
export type CreateLandingPageRequest = z.infer<typeof insertLandingPageSchema>;
export type UpdateLandingPageRequest = Partial<CreateLandingPageRequest>;

export type DashboardStats = {
  totalVisits: number;
  botVisits: number;
  realVisits: number;
  botPercentage: number;
  recentLogs: AccessLog[];
  todayVisits: number;
  todayBots: number;
  todayReal: number;
};
