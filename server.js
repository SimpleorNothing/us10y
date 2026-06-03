// Minimal Express server for Railway deployment.
// Serves the static dashboard at the root and the data.json from repo root.
// (Hosted at us10y.simpleornothing.com — dedicated subdomain, served at /.)
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Backward-compat: old /us10y/* paths redirect to root (helps during DNS cutover).
app.get("/us10y/data.json", (req, res) => res.redirect(301, "/data.json"));
app.get(["/us10y", "/us10y/*"], (req, res) => res.redirect(301, "/"));

// Serve data.json (lives in repo root for git-friendly diffs)
app.get("/data.json", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "data.json"));
});

// Serve dashboard static files at the root
app.use("/", express.static(path.join(__dirname, "public"), {
  setHeaders: (res) => {
    res.set("Cache-Control", "public, max-age=300");
  },
}));

// Health check
app.get("/healthz", (req, res) => res.send("ok"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
