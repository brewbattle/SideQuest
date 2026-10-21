import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
const app = express();
const root = path.dirname(fileURLToPath(import.meta.url));
app.disable("x-powered-by");
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("X-Frame-Options", "DENY");
  next();
});
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", storage: "browser-only", version: "1.0.0" }),
);
app.use("/api", (_req, res) =>
  res.status(404).json({
    error: "No upload or sync API. Your course files stay in your browser.",
  }),
);
app.use(express.static(path.join(root, "dist"), { maxAge: 0 }));
app.get("/{*path}", (_req, res) =>
  res.sendFile(path.join(root, "dist", "index.html")),
);
const port = Number(process.env.PORT || 3000);
app.listen(port, "0.0.0.0", () =>
  console.log(`SideQuest listening on port ${port}`),
);
