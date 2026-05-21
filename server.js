// Minimal Express server for Railway deployment.
// Serves the static dashboard at /us10y and the data.json from repo root.
import express from "express";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// Serve data.json (lives in repo root for git-friendly diffs)
app.get("/us10y/data.json", (req, res) => {
  res.set("Cache-Control", "no-store");
  res.sendFile(path.join(__dirname, "data.json"));
});

// Serve dashboard static files under /us10y
app.use("/us10y", express.static(path.join(__dirname, "public"), {
  setHeaders: (res) => {
    res.set("Cache-Control", "public, max-age=300");
  },
}));

// Health check
app.get("/healthz", (req, res) => res.send("ok"));

// Root → redirect to /us10y
app.get("/", (req, res) => res.redirect("/us10y"));

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
