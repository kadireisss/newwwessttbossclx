import { execSync } from "child_process";
import * as esbuild from "esbuild";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, "..");

console.log("🔨 Building BOSS Cloaker v3.2...\n");

console.log("📦 Step 1/2: Building frontend...");
execSync("npx vite build --config vite.config.ts", { cwd: projectRoot, stdio: "inherit" });
console.log("✅ Frontend → dist/public/\n");

console.log("📦 Step 2/2: Bundling backend...");
const skipDev: esbuild.Plugin = {
  name: "skip-dev",
  setup(build) {
    build.onResolve({ filter: /\.\/vite$/ }, (args) => {
      if (args.importer.includes("server")) return { path: args.path, external: true };
    });
  },
};

await esbuild.build({
  entryPoints: [path.join(projectRoot, "server/index.ts")],
  bundle: true,
  platform: "node",
  target: "node20",
  format: "cjs",
  outfile: path.join(projectRoot, "dist/index.cjs"),
  plugins: [skipDev],
  external: [
    "pg-native", "better-sqlite3", "mysql2", "@libsql/client",
    "bufferutil", "utf-8-validate", "ws",
    "vite", "@vitejs/plugin-react", "lightningcss", "esbuild", "nanoid",
    "pg-cloudflare", "compression", "connect-pg-simple",
  ],
  alias: { "@shared": path.join(projectRoot, "shared") },
  define: { "import.meta.dirname": "__dirname" },
  sourcemap: false,
  minify: false,
  logLevel: "info",
});
console.log("✅ Backend → dist/index.cjs\n");
console.log("🎉 Done! Run: NODE_ENV=production node dist/index.cjs");
