import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  const distPath = path.resolve(__dirname, "public");
  if (!fs.existsSync(distPath)) {
    throw new Error(`Could not find build directory: ${distPath}`);
  }

  app.use(express.static(distPath, {
    maxAge: '30d',
    etag: true,
    index: false,
  }));

  app.use("*", (req, res) => {
    const adminPaths = ['/login', '/domains', '/landing-pages', '/logs', '/blacklist', '/settings'];
    const requestPath = req.baseUrl || req.path;
    
    if (requestPath === '/' || requestPath === '') {
      if (req.session?.userId) {
        return res.sendFile(path.resolve(distPath, "index.html"));
      }
      return res.redirect('/maintenance');
    }
    
    if (adminPaths.some(p => requestPath.startsWith(p))) {
      return res.sendFile(path.resolve(distPath, "index.html"));
    }
    
    res.sendFile(path.resolve(distPath, "index.html"));
  });
}
