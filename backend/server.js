const express = require("express");
const cors = require("cors");
const { initDb } = require("./db/init");

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({ origin: "*", credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

async function start() {
  try {
    await initDb();
    console.log("DB initialized successfully");
  } catch (e) {
    console.error("FATAL: DB init failed:", e.message);
    process.exit(1);
  }

  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/users", require("./routes/users"));
  app.use("/api/areas", require("./routes/areas"));
  app.use("/api/months", require("./routes/months"));
  app.use("/api/ratings", require("./routes/ratings"));
  app.use("/api/remarks", require("./routes/remarks"));
  app.use("/api/settings", require("./routes/settings"));

  app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date().toISOString() }));
  app.use((req, res) => res.status(404).json({ error: "Not found" }));

  // Global error handler - logs full error to console
  app.use((err, req, res, next) => {
    console.error("=== UNHANDLED ERROR ===");
    console.error("Route:", req.method, req.path);
    console.error("Error:", err.message);
    console.error("Stack:", err.stack);
    res.status(500).json({ error: err.message || "Server error" });
  });

  app.listen(PORT, () => {
    console.log(`SAI WARDHA backend running on http://localhost:${PORT}`);
    console.log("Default login: admin / admin123");
  });
}

start();