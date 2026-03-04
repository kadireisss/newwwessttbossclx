/**
 * BOSS Cloaker v3.2 - Bot Detection Engine
 * 
 * CRITICAL FIX: Click IDs (gclid, fbclid, msclkid) are NOT scored.
 * These come from REAL users clicking ads, not bots.
 * Google verification bots DON'T have gclid - they use known IP ranges.
 */

import net from "net";

// ============================================
// PRE-COMPILED IP RANGE MATCHER
// Parse CIDR once at startup, not per-request
// ============================================
class IpRangeMatcher {
  private v4Ranges: { ip: number; mask: number }[] = [];
  private v6Ranges: { prefix: string; bits: number }[] = [];

  constructor(cidrs: string[]) {
    for (const cidr of cidrs) {
      if (cidr.includes(':')) {
        const [range, bits] = cidr.split('/');
        this.v6Ranges.push({ prefix: this.expandIPv6(range.toLowerCase()), bits: parseInt(bits, 10) });
      } else {
        const [range, bits] = cidr.split('/');
        const mask = ~((1 << (32 - parseInt(bits, 10))) - 1);
        this.v4Ranges.push({ ip: this.ipToLong(range) & mask, mask });
      }
    }
  }

  contains(ip: string): boolean {
    if (net.isIPv4(ip)) {
      const ipLong = this.ipToLong(ip);
      for (const range of this.v4Ranges) {
        if ((ipLong & range.mask) === range.ip) return true;
      }
    } else if (net.isIPv6(ip)) {
      const expanded = this.expandIPv6(ip.toLowerCase());
      const ipBin = this.ipv6ToBinary(expanded);
      for (const range of this.v6Ranges) {
        const rangeBin = this.ipv6ToBinary(range.prefix);
        if (ipBin.substring(0, range.bits) === rangeBin.substring(0, range.bits)) return true;
      }
    }
    return false;
  }

  private ipToLong(ip: string): number {
    let result = 0;
    for (const octet of ip.split('.')) {
      result = (result << 8) + parseInt(octet, 10);
    }
    return result >>> 0;
  }

  private expandIPv6(ip: string): string {
    const parts = ip.split(':');
    const idx = ip.indexOf('::');
    if (idx !== -1) {
      const nonEmpty = parts.filter(p => p !== '');
      const missing = 8 - nonEmpty.length;
      const expanded: string[] = [];
      let found = false;
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === '' && !found) {
          for (let j = 0; j < missing; j++) expanded.push('0000');
          found = true;
          while (i + 1 < parts.length && parts[i + 1] === '') i++;
        } else if (parts[i] !== '') {
          expanded.push(parts[i].padStart(4, '0'));
        }
      }
      while (expanded.length < 8) expanded.push('0000');
      return expanded.slice(0, 8).join(':');
    }
    return parts.map(p => p.padStart(4, '0')).join(':');
  }

  private ipv6ToBinary(expanded: string): string {
    return expanded.split(':').map(h => parseInt(h, 16).toString(2).padStart(16, '0')).join('');
  }
}

// ============================================
// IP RANGES - Pre-compiled at module load
// ============================================

const GOOGLE_MATCHER = new IpRangeMatcher([
  '66.249.64.0/19', '66.249.0.0/16', '64.233.160.0/19', '64.233.0.0/16',
  '72.14.192.0/18', '72.14.0.0/16', '209.85.128.0/17', '209.85.0.0/16',
  '216.239.32.0/19', '216.239.0.0/16', '66.102.0.0/20', '74.125.0.0/16',
  '173.194.0.0/16', '142.250.0.0/15', '172.217.0.0/16', '216.58.0.0/16',
  '108.177.0.0/17', '35.190.0.0/17', '35.191.0.0/16', '130.211.0.0/22',
  '34.64.0.0/10', '35.184.0.0/13', '35.192.0.0/14', '35.196.0.0/15',
  '35.198.0.0/16', '35.199.0.0/16', '35.200.0.0/13', '35.208.0.0/12',
  '35.224.0.0/12', '35.240.0.0/13',
  '2001:4860::/32', '2404:6800::/32', '2607:f8b0::/32',
  '2800:3f0::/32', '2a00:1450::/32', '2c0f:fb50::/32',
]);

const FACEBOOK_MATCHER = new IpRangeMatcher([
  '31.13.24.0/21', '31.13.64.0/18', '45.64.40.0/22', '66.220.144.0/20',
  '69.63.176.0/20', '69.171.224.0/19', '74.119.76.0/22', '102.132.96.0/20',
  '103.4.96.0/22', '129.134.0.0/16', '157.240.0.0/16', '173.252.64.0/18',
  '179.60.192.0/22', '185.60.216.0/22', '185.89.216.0/22', '199.201.64.0/22',
  '204.15.20.0/22',
  '2a03:2880::/32', '2620:0:1c00::/40', '2620:0:1cff::/48',
]);

const MICROSOFT_MATCHER = new IpRangeMatcher([
  '13.64.0.0/11', '13.96.0.0/13', '13.104.0.0/14', '20.0.0.0/8',
  '40.64.0.0/10', '40.74.0.0/15', '40.76.0.0/14', '40.80.0.0/12',
  '40.96.0.0/12', '40.112.0.0/13', '40.120.0.0/14', '40.124.0.0/16',
  '40.125.0.0/17', '40.126.0.0/18', '52.0.0.0/8', '65.52.0.0/14',
  '70.37.0.0/17', '70.37.128.0/18', '104.40.0.0/13', '104.208.0.0/13',
  '131.253.0.0/16', '134.170.0.0/16', '137.116.0.0/15', '137.135.0.0/16',
  '138.91.0.0/16', '157.55.0.0/16', '157.56.0.0/14', '168.61.0.0/16',
  '168.62.0.0/15', '191.232.0.0/13', '199.30.16.0/20', '207.46.0.0/16',
  '2603:1000::/25', '2603:1010::/25', '2603:1020::/25',
  '2603:1030::/25', '2603:1040::/25', '2603:1050::/25', '2a01:111::/32',
]);

const CLOUDFLARE_MATCHER = new IpRangeMatcher([
  '173.245.48.0/20', '103.21.244.0/22', '103.22.200.0/22', '103.31.4.0/22',
  '141.101.64.0/18', '108.162.192.0/18', '190.93.240.0/20', '188.114.96.0/20',
  '197.234.240.0/22', '198.41.128.0/17', '162.158.0.0/15', '104.16.0.0/13',
  '104.24.0.0/14', '172.64.0.0/13', '131.0.72.0/22',
]);

const USOM_MATCHER = new IpRangeMatcher([
  '193.140.0.0/16', '193.255.0.0/16', '212.174.0.0/16', '85.120.0.0/14',
]);

const SECURITY_SCANNER_MATCHER = new IpRangeMatcher([
  '74.125.0.0/16', '185.220.101.0/24', '192.88.134.0/23', '185.93.228.0/22',
  '199.83.128.0/21', '198.143.32.0/19', '23.0.0.0/12', '23.32.0.0/11',
  '23.64.0.0/14', '23.72.0.0/13', '96.16.0.0/15', '96.6.0.0/15',
  '104.64.0.0/10', '184.24.0.0/13', '184.50.0.0/15', '184.84.0.0/14',
]);

const DATACENTER_MATCHER = new IpRangeMatcher([
  // DigitalOcean
  '104.131.0.0/16', '104.236.0.0/16', '138.68.0.0/16', '138.197.0.0/16',
  '139.59.0.0/16', '142.93.0.0/16', '159.65.0.0/16', '159.89.0.0/16',
  '161.35.0.0/16', '162.243.0.0/16', '165.22.0.0/16', '167.71.0.0/16',
  '167.172.0.0/16', '178.128.0.0/16', '188.166.0.0/16', '206.189.0.0/16',
  // Linode
  '45.33.0.0/16', '45.56.0.0/16', '45.79.0.0/16', '50.116.0.0/16',
  '139.162.0.0/16', '172.104.0.0/15',
  // Vultr
  '45.32.0.0/16', '45.63.0.0/16', '45.76.0.0/15', '66.42.0.0/16',
  '108.61.0.0/16', '136.244.0.0/16', '140.82.0.0/16', '144.202.0.0/16',
  '149.28.0.0/16', '155.138.0.0/16', '207.148.0.0/16',
  // Hetzner
  '5.9.0.0/16', '46.4.0.0/16', '78.46.0.0/15', '88.198.0.0/15',
  '94.130.0.0/16', '95.216.0.0/15', '116.202.0.0/15', '116.203.0.0/16',
  '135.181.0.0/16', '136.243.0.0/16', '138.201.0.0/16', '144.76.0.0/16',
  '148.251.0.0/16', '157.90.0.0/16', '159.69.0.0/16', '162.55.0.0/16',
  '167.235.0.0/16', '168.119.0.0/16', '176.9.0.0/16', '178.63.0.0/16',
  '188.40.0.0/16', '195.201.0.0/16',
  // OVH
  '5.39.0.0/16', '5.135.0.0/16', '5.196.0.0/15', '37.59.0.0/16',
  '37.187.0.0/16', '46.105.0.0/16', '51.38.0.0/15', '51.68.0.0/15',
  '51.75.0.0/16', '51.77.0.0/16', '51.79.0.0/16', '51.83.0.0/16',
  '51.89.0.0/16', '51.91.0.0/16', '54.36.0.0/14', '91.121.0.0/16',
  '92.222.0.0/16', '137.74.0.0/16', '139.99.0.0/16', '141.94.0.0/16',
  '141.95.0.0/16', '144.217.0.0/16', '145.239.0.0/16', '147.135.0.0/16',
  '149.56.0.0/16', '151.80.0.0/16', '158.69.0.0/16', '164.132.0.0/16',
  '167.114.0.0/16', '176.31.0.0/16', '178.32.0.0/15', '188.165.0.0/16',
  '198.27.64.0/18', '198.50.128.0/17',
  // AWS (subset - most common scanner ranges)
  '3.0.0.0/9', '18.0.0.0/8', '52.0.0.0/8', '54.0.0.0/8',
]);

// ============================================
// BOT USER-AGENT PATTERNS
// ============================================
const BOT_UA_PATTERNS: string[] = [
  // Ad Platform Bots
  'googleads', 'google-ads', 'adsbot', 'mediapartners',
  'facebookexternalhit', 'facebookcatalog', 'facebot',
  'bingpreview', 'adidxbot', 'bingbot',
  'twitterbot', 'linkedinbot', 'pinterestbot',
  'slackbot', 'telegrambot', 'whatsapp',
  // Search Bots
  'googlebot', 'google-inspectiontool',
  'slurp', 'duckduckbot', 'yandexbot', 'baiduspider', 'sogou',
  // Generic Bot Patterns
  'bot/', 'crawler', 'spider', 'scraper', 'robot',
  // Programming tools
  'curl/', 'wget/', 'python', 'java/', 'perl/',
  'go-http-client', 'axios/', 'node-fetch', 'okhttp',
  'apache-httpclient', 'libwww', 'urllib', 'aiohttp',
  // Headless
  'headlesschrome', 'headless', 'phantomjs',
  'selenium', 'puppeteer', 'playwright', 'chrome-lighthouse',
  // Security
  'virustotal', 'urlscan', 'safeweb',
  'kaspersky', 'norton', 'mcafee', 'avast', 'bitdefender',
  'eset', 'avg', 'sophos', 'trendmicro', 'symantec',
  // Scanners
  'nessus', 'nikto', 'nmap', 'masscan', 'zap', 'burp',
  'sqlmap', 'acunetix', 'qualys', 'shodan', 'censys',
  // Cloud
  'cloudflare', 'akamai', 'fastly', 'cloudfront', 'imperva',
  // Turkish Security
  'usom', 'tubitak', 'redpage',
  // Link Checkers
  'linkchecker', 'w3c_validator', 'gtmetrix', 'pagespeed', 'lighthouse',
  // Preview
  'preview', 'thumbnail', 'snapshot', 'screenshotbot',
];

// Platform-specific patterns
const PLATFORM_UA_PATTERNS: Record<string, string[]> = {
  google: ['googleads', 'google-ads', 'adsbot', 'mediapartners', 'googlebot', 'google-inspectiontool'],
  facebook: ['facebookexternalhit', 'facebookcatalog', 'facebot'],
  microsoft: ['bingpreview', 'adidxbot', 'bingbot'],
  bing: ['bingpreview', 'adidxbot', 'bingbot'],
  tiktok: ['tiktok', 'bytespider', 'bytedance'],
  twitter: ['twitterbot'],
  linkedin: ['linkedinbot'],
  pinterest: ['pinterestbot'],
};

const PLATFORM_IP_MATCHERS: Record<string, IpRangeMatcher> = {
  google: GOOGLE_MATCHER,
  facebook: FACEBOOK_MATCHER,
  microsoft: MICROSOFT_MATCHER,
  bing: MICROSOFT_MATCHER,
  cloudflare: CLOUDFLARE_MATCHER,
};

// Click ID to platform mapping (for LOGGING only, NOT scoring)
const CLICK_ID_PLATFORMS: Record<string, string> = {
  gclid: 'google',
  fbclid: 'facebook',
  msclkid: 'microsoft',
  ttclid: 'tiktok',
  twclid: 'twitter',
  li_fat_id: 'linkedin',
};

// ============================================
// DETECTION TYPES
// ============================================
export type DomainSettings = {
  blockDirectAccess: boolean;
  blockedPlatforms: string;
  detectionLevel: string;
};

export type DetectionResult = {
  isBot: boolean;
  score: number;
  reasons: string[];
  clickId?: string; // For logging only
};

// ============================================
// MAIN DETECTION FUNCTION
// ============================================
export async function detectBot(
  ip: string,
  userAgent: string,
  headers: any,
  fullUrl?: string,
  domainSettings?: DomainSettings
): Promise<DetectionResult> {
  let score = 0;
  const reasons: string[] = [];

  const blockedPlatforms = domainSettings?.blockedPlatforms?.split(',').map(p => p.trim().toLowerCase()) ||
    ['google', 'facebook', 'bing', 'tiktok', 'twitter', 'linkedin'];
  const detectionLevel = domainSettings?.detectionLevel || 'high';

  const thresholds: Record<string, number> = {
    low: 80,
    medium: 60,
    high: 50,
    paranoid: 30,
  };
  const threshold = thresholds[detectionLevel] || 50;

  const uaLower = userAgent.toLowerCase();

  // ============================================
  // 1. PLATFORM IP DETECTION (most reliable)
  // ============================================
  for (const platform of blockedPlatforms) {
    const matcher = PLATFORM_IP_MATCHERS[platform];
    if (matcher?.contains(ip)) {
      score += 100;
      reasons.push(`${platform.toUpperCase()}_IP_DETECTED`);
    }

    const uaPatterns = PLATFORM_UA_PATTERNS[platform];
    if (uaPatterns) {
      for (const pattern of uaPatterns) {
        if (uaLower.includes(pattern)) {
          score += 80;
          reasons.push(`${platform.toUpperCase()}_UA: ${pattern}`);
          break;
        }
      }
    }
  }

  // ============================================
  // 2. ALWAYS CHECK: Security/Datacenter IPs
  // ============================================
  if (USOM_MATCHER.contains(ip)) {
    score += 100;
    reasons.push('USOM_IP_DETECTED');
  }

  if (SECURITY_SCANNER_MATCHER.contains(ip)) {
    score += 90;
    reasons.push('SECURITY_SCANNER_IP');
  }

  if (DATACENTER_MATCHER.contains(ip)) {
    score += 60;
    reasons.push('DATACENTER_IP');
  }

  // ============================================
  // 3. USER-AGENT ANALYSIS
  // ============================================
  if (!userAgent || userAgent.length < 30) {
    score += 50;
    reasons.push('SHORT_OR_EMPTY_UA');
  } else {
    for (const pattern of BOT_UA_PATTERNS) {
      if (uaLower.includes(pattern)) {
        score += 50;
        reasons.push(`BOT_UA: ${pattern}`);
        break;
      }
    }
  }

  // ============================================
  // 4. HEADER ANALYSIS
  // ============================================
  if (!headers['accept-language']) {
    score += 15;
    reasons.push('MISSING_ACCEPT_LANGUAGE');
  }

  if (!headers['accept-encoding']) {
    score += 10;
    reasons.push('MISSING_ACCEPT_ENCODING');
  }

  if (!headers['accept']) {
    score += 10;
    reasons.push('MISSING_ACCEPT');
  }

  // Chrome without Sec-Fetch headers = likely headless
  const hasSecFetch = headers['sec-fetch-mode'] || headers['sec-fetch-site'] || headers['sec-fetch-dest'];
  if (!hasSecFetch && userAgent.includes('Chrome')) {
    score += 25;
    reasons.push('CHROME_WITHOUT_SEC_FETCH');
  }

  // Multiple proxy headers
  if (headers['via'] || (headers['x-forwarded-for'] && headers['x-forwarded-for'].includes(','))) {
    score += 10;
    reasons.push('PROXY_HEADERS_DETECTED');
  }

  // ============================================
  // 5. CLICK ID HANDLING
  // CRITICAL: Do NOT add score for click IDs!
  // gclid = real user clicked a Google Ad
  // Google bots DON'T have gclid
  // ============================================
  let detectedClickId: string | undefined;

  if (fullUrl) {
    try {
      const urlObj = new URL(fullUrl, 'http://localhost');
      for (const [paramName, platform] of Object.entries(CLICK_ID_PLATFORMS)) {
        const value = urlObj.searchParams.get(paramName);
        if (value) {
          detectedClickId = `${paramName}=${value.substring(0, 20)}`;
          // LOG ONLY - NO SCORE PENALTY
          reasons.push(`CLICK_ID_LOGGED: ${paramName} (${platform})`);
          break;
        }
      }
    } catch { /* ignore malformed URLs */ }
  }

  // ============================================
  // 6. DIRECT ACCESS DETECTION
  // ============================================
  const referer = headers['referer'] || headers['referrer'];
  if (domainSettings?.blockDirectAccess && !referer) {
    if (!headers['accept-language'] || !headers['accept-encoding']) {
      score += 50;
      reasons.push('DIRECT_ACCESS_BLOCKED');
    } else {
      score += 30;
      reasons.push('DIRECT_ACCESS_WARNING');
    }
  }

  // ============================================
  // 7. AD PLATFORM REFERER (not from user click - from bot crawl)
  // ============================================
  if (referer) {
    const refLower = referer.toLowerCase();
    const adRefererPatterns = [
      'googleads.g.doubleclick.net', 'googlesyndication.com',
      'google.com/pagead', 'google.com/aclk',
      'facebook.com/ads', 'facebook.com/tr', 'business.facebook.com',
      'bing.com/aclk', 'bing.com/ads',
    ];
    for (const adRef of adRefererPatterns) {
      if (refLower.includes(adRef)) {
        const matchedPlatform = blockedPlatforms.find(p => adRef.includes(p));
        if (matchedPlatform) {
          score += 30;
          reasons.push(`AD_REFERER: ${adRef}`);
        }
        break;
      }
    }
  }

  // ============================================
  // 8. NO COOKIES WITH REFERER (bot-like)
  // ============================================
  if (!headers['cookie'] && referer) {
    score += 15;
    reasons.push('NO_COOKIES_WITH_REFERER');
  }

  // ============================================
  // FINAL DECISION
  // ============================================
  return {
    isBot: score >= threshold,
    score,
    reasons,
    clickId: detectedClickId,
  };
}
