type AnyReq = {
  url?: string;
  query?: Record<string, string | string[] | undefined>;
};

export default async function handler(req: AnyReq, res: any) {
  try {
    const rawPath = req.query?.__path;
    const routedPath = Array.isArray(rawPath) ? rawPath[0] : rawPath;

    if (typeof routedPath === "string" && routedPath.length > 0) {
      const incoming = new URL(req.url || "/", "http://localhost");
      incoming.searchParams.delete("__path");
      const qs = incoming.searchParams.toString();
      req.url = qs ? `${routedPath}?${qs}` : routedPath;
    }

    const mod = await import("../server/vercel-entry");
    return mod.default(req as any, res);
  } catch (error: any) {
    console.error("[api-fatal]", error);
    if (!res.headersSent) {
      return res.status(500).json({
        message: error?.message || "Unhandled server error",
      });
    }
  }
}
