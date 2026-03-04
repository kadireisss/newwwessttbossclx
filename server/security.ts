import crypto from "crypto";
import net from "net";
import type { NextFunction, Request, Response } from "express";
import type { IncomingHttpHeaders } from "http";

const STATE_CHANGING_METHODS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const REDACTED_HEADER_NAMES = new Set([
  "authorization",
  "cookie",
  "set-cookie",
  "proxy-authorization",
  "x-api-key",
  "x-auth-token",
]);
const UA_PATTERN_MAX_LENGTH = 128;

function normalizeIp(ip: string): string {
  if (ip.startsWith("::ffff:")) {
    return ip.slice(7);
  }
  return ip;
}

export function getSessionSecret(): string {
  const secret = process.env.SESSION_SECRET?.trim();
  const isProd = process.env.NODE_ENV === "production";

  if (isProd && (!secret || secret.length < 32)) {
    throw new Error("SESSION_SECRET must be set (minimum 32 chars) in production.");
  }

  if (!secret || secret.length < 32) {
    return crypto.randomBytes(48).toString("hex");
  }

  return secret;
}

export function getTrustedClientIp(req: Request): string {
  const candidates = [
    req.headers["x-vercel-forwarded-for"],
    req.headers["x-real-ip"],
    req.headers["x-forwarded-for"],
    req.ip,
    req.socket.remoteAddress,
  ];

  for (const candidate of candidates) {
    if (!candidate) continue;

    const raw = Array.isArray(candidate) ? candidate[0] : String(candidate);
    const ip = normalizeIp(raw.split(",")[0].trim());
    if (net.isIP(ip)) return ip;
  }

  return "0.0.0.0";
}

export function sanitizeHeadersForLogs(headers: IncomingHttpHeaders): Record<string, string> {
  const safe: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers)) {
    const lower = key.toLowerCase();
    if (REDACTED_HEADER_NAMES.has(lower)) continue;
    if (value == null) continue;

    const normalizedValue = Array.isArray(value) ? value.join(", ") : String(value);
    // Keep logs bounded and avoid accidental huge payloads.
    safe[lower] = normalizedValue.slice(0, 512);
  }

  return safe;
}

export function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export function escapeHtmlAttribute(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/"/g, "&quot;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function hasSameHost(value: string, hostHeader: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.host.toLowerCase() === hostHeader.toLowerCase();
  } catch {
    return false;
  }
}

export function enforceSameOrigin(req: Request, res: Response, next: NextFunction): void {
  if (!STATE_CHANGING_METHODS.has(req.method.toUpperCase())) return next();
  if (!req.path.startsWith("/api")) return next();

  const host = req.headers.host;
  if (!host) {
    res.status(400).json({ message: "Missing host header" });
    return;
  }

  const origin = req.headers.origin;
  const referer = req.headers.referer || req.headers.referrer;

  // Allow non-browser clients (curl, server-to-server) that don't send Origin/Referer.
  if (!origin && !referer) return next();

  if (typeof origin === "string" && hasSameHost(origin, host)) return next();
  if (typeof referer === "string" && hasSameHost(referer, host)) return next();

  res.status(403).json({ message: "Cross-site request blocked" });
}

export function parsePositiveInt(raw: unknown): number | null {
  const value = Number.parseInt(String(raw), 10);
  if (!Number.isInteger(value) || value < 1) return null;
  return value;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

function parseIpv4(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;

  let value = 0;
  for (const part of parts) {
    if (!/^\d+$/.test(part)) return null;
    const n = Number.parseInt(part, 10);
    if (n < 0 || n > 255) return null;
    value = (value << 8) | n;
  }

  return value >>> 0;
}

function parseIpv4Cidr(cidr: string): { network: number; mask: number } | null {
  const [ipRaw, prefixRaw] = cidr.split("/");
  if (!ipRaw || prefixRaw == null) return null;

  const ip = parseIpv4(ipRaw.trim());
  const prefix = Number.parseInt(prefixRaw.trim(), 10);
  if (ip == null || !Number.isInteger(prefix) || prefix < 0 || prefix > 32) {
    return null;
  }

  const mask = prefix === 0 ? 0 : (0xffffffff << (32 - prefix)) >>> 0;
  return { network: ip & mask, mask };
}

export function isValidIpOrCidr(value: string): boolean {
  const input = value.trim();
  if (!input) return false;
  if (net.isIP(input) !== 0) return true;
  return parseIpv4Cidr(input) !== null;
}

export function isIpInCidr(ip: string, cidr: string): boolean {
  const parsedIp = parseIpv4(ip.trim());
  const parsedCidr = parseIpv4Cidr(cidr.trim());
  if (parsedIp == null || !parsedCidr) return false;
  return (parsedIp & parsedCidr.mask) === parsedCidr.network;
}

export function normalizeUaPatternInput(raw: string): string {
  return raw.trim().toLowerCase().slice(0, UA_PATTERN_MAX_LENGTH);
}

function stripRegexDelimiters(pattern: string): string {
  if (!(pattern.startsWith("/") && pattern.length > 2)) return pattern;

  const lastSlash = pattern.lastIndexOf("/");
  if (lastSlash <= 0) return pattern;

  const body = pattern.slice(1, lastSlash);
  const flags = pattern.slice(lastSlash + 1);
  if (!/^[gimsuy]*$/.test(flags)) return pattern;
  return body;
}

function simplifyUaPatternPart(raw: string): string {
  let part = stripRegexDelimiters(raw.trim().toLowerCase());
  part = part.replace(/\\([\\.^$|?*+()[\]{}])/g, "$1");
  part = part.replace(/^\^+/, "").replace(/\$+$/, "");
  part = part.replace(/^\.\*+/, "").replace(/\.\*+$/, "");
  part = part.replace(/\.\*/g, "*");
  part = part.replace(/\*+/g, "*");
  return part.trim();
}

export function extractUaPatternTokens(raw: string): string[] {
  const normalized = normalizeUaPatternInput(raw);
  if (!normalized) return [];

  const source = stripRegexDelimiters(normalized);
  const splitParts = source
    .split("|")
    .map((part) => simplifyUaPatternPart(part))
    .filter((part) => part.length > 0 && part.length <= UA_PATTERN_MAX_LENGTH);

  if (splitParts.length === 0) return [normalized];
  return Array.from(new Set(splitParts));
}

export function matchUaToken(userAgent: string, token: string): boolean {
  const ua = userAgent.toLowerCase();
  const candidate = token.toLowerCase();
  if (!candidate) return false;

  if (candidate.includes("*") || candidate.includes("?")) {
    return buildUaWildcardRegex(candidate).test(ua);
  }

  return ua.includes(candidate);
}

export function buildUaWildcardRegex(token: string): RegExp {
  const escaped = token.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regexSource = escaped.replace(/\\\*/g, ".*").replace(/\\\?/g, ".");
  return new RegExp(regexSource, "i");
}
