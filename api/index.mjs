export default function handler(_req, res) {
  res.statusCode = 500;
  res.setHeader("content-type", "application/json; charset=utf-8");
  res.end(
    JSON.stringify({
      message: "API bundle not generated. Check Vercel build logs.",
    }),
  );
}
