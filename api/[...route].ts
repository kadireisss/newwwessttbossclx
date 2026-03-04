import app from "../server/vercel-entry";

export default function handler(req: any, res: any) {
  // Rewrites map /maintenance and /r/:slug to /api/* on Vercel.
  // Normalize those paths back so existing Express routes continue to work.
  if (typeof req.url === "string") {
    if (req.url === "/api/maintenance" || req.url.startsWith("/api/maintenance?")) {
      req.url = req.url.slice(4);
    } else if (req.url.startsWith("/api/r/")) {
      req.url = req.url.slice(4);
    }
  }

  return app(req, res);
}
