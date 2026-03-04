import app from "../server/vercel-entry";

type AnyReq = {
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

export default function handler(req: AnyReq, res: any) {
  const rawPath = req.query?.__path;
  const routedPath = Array.isArray(rawPath) ? rawPath[0] : rawPath;

  if (typeof routedPath === "string" && routedPath.length > 0) {
    const incoming = new URL(req.url || "/", "http://localhost");
    incoming.searchParams.delete("__path");
    const qs = incoming.searchParams.toString();
    req.url = qs ? `${routedPath}?${qs}` : routedPath;
  }

  return app(req as any, res);
}
