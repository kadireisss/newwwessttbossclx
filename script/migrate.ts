import "dotenv/config";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("DATABASE_URL is not set");
  process.exit(1);
}

const client = new pg.Client({
  connectionString: url,
  ssl: { rejectUnauthorized: false },
});

await client.connect();
console.log("Connected to database");

const sql = `
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password TEXT NOT NULL,
  email TEXT,
  last_login TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS landing_pages (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  html_content TEXT NOT NULL,
  css_content TEXT,
  js_content TEXT,
  thumbnail TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS domains (
  id SERIAL PRIMARY KEY,
  domain TEXT NOT NULL UNIQUE,
  slug TEXT UNIQUE,
  target_url TEXT NOT NULL,
  landing_page_id INTEGER REFERENCES landing_pages(id),
  redirect_enabled BOOLEAN DEFAULT TRUE,
  detection_level TEXT DEFAULT 'high',
  status TEXT DEFAULT 'active',
  allowed_countries TEXT,
  blocked_countries TEXT,
  block_direct_access BOOLEAN DEFAULT FALSE,
  blocked_platforms TEXT DEFAULT 'google,facebook,bing,tiktok',
  js_challenge BOOLEAN DEFAULT FALSE,
  redirect_mode TEXT DEFAULT '302',
  active_hours TEXT,
  active_days TEXT,
  timezone TEXT DEFAULT 'Europe/Istanbul',
  max_clicks_per_ip INTEGER DEFAULT 0,
  rate_limit_window INTEGER DEFAULT 3600,
  allow_mobile BOOLEAN DEFAULT TRUE,
  allow_desktop BOOLEAN DEFAULT TRUE,
  total_clicks INTEGER DEFAULT 0,
  bot_clicks INTEGER DEFAULT 0,
  real_clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS rate_limits (
  id SERIAL PRIMARY KEY,
  domain_id INTEGER REFERENCES domains(id),
  ip_address TEXT NOT NULL,
  click_count INTEGER DEFAULT 1,
  first_click TIMESTAMP DEFAULT NOW(),
  last_click TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS challenge_tokens (
  id SERIAL PRIMARY KEY,
  token TEXT NOT NULL UNIQUE,
  domain_id INTEGER REFERENCES domains(id),
  ip_address TEXT,
  user_agent TEXT,
  verified BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT NOW(),
  expires_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ip_blacklist (
  id SERIAL PRIMARY KEY,
  ip_address TEXT NOT NULL,
  reason TEXT,
  added_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_agent_blacklist (
  id SERIAL PRIMARY KEY,
  pattern TEXT NOT NULL,
  reason TEXT,
  added_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS access_logs (
  id SERIAL PRIMARY KEY,
  domain_id INTEGER REFERENCES domains(id),
  ip_address TEXT,
  user_agent TEXT,
  referer TEXT,
  country TEXT,
  is_bot BOOLEAN,
  bot_score INTEGER,
  bot_reasons TEXT,
  destination TEXT,
  click_id TEXT,
  headers JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  id SERIAL PRIMARY KEY,
  key TEXT UNIQUE NOT NULL,
  value TEXT,
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_sessions (
  sid VARCHAR NOT NULL PRIMARY KEY,
  sess JSON NOT NULL,
  expire TIMESTAMP(6) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_session_expire ON user_sessions(expire);
`;

await client.query(sql);
console.log("All tables created successfully!");

// Seed admin user
const adminPassword = process.env.ADMIN_PASSWORD || "boss_admin_123";
const { default: bcrypt } = await import("bcryptjs");
const existing = await client.query("SELECT id FROM users WHERE username = 'admin'");
if (existing.rows.length === 0) {
  const hash = await bcrypt.hash(adminPassword, 12);
  await client.query(
    "INSERT INTO users (username, password, email) VALUES ('admin', $1, 'admin@boss.local')",
    [hash],
  );
  console.log("Admin user created. Password:", adminPassword);
} else if (process.env.ADMIN_PASSWORD) {
  const hash = await bcrypt.hash(adminPassword, 12);
  await client.query("UPDATE users SET password = $1 WHERE username = 'admin'", [hash]);
  console.log("Admin password updated from ADMIN_PASSWORD env var.");
} else {
  console.log("Admin user already exists, skipping seed.");
}

await client.end();
console.log("Done.");
