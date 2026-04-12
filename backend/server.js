// Load env FIRST, before anything else
const dotenvResult = require("dotenv").config();
if (dotenvResult.error) {
  console.warn("⚠️ .env file not found or failed to load:", dotenvResult.error.message);
}

const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const app = express();

// ── DEBUG START ──
console.log("🚀 Starting FacultySync server...");
console.log("🌐 MONGO_URI:", process.env.MONGO_URI ? "Loaded ✅" : "Missing ❌");
console.log("📂 Current directory:", __dirname);

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: "10mb" }));

const FRONTEND_PATH = path.resolve(__dirname, "../frontend");
console.log("📁 Frontend path:", FRONTEND_PATH);
console.log("📁 Frontend exists:", fs.existsSync(FRONTEND_PATH) ? "Yes ✅" : "No ❌");

app.use(express.static(FRONTEND_PATH));

// ── API Routes Loader ──
const loadRoute = (routePath, apiPath) => {
  try {
    const routeFile = path.join(__dirname, routePath);
    if (fs.existsSync(routeFile)) {
      app.use(apiPath, require(routeFile));
      console.log(`✅ ${apiPath} routes loaded`);
    } else {
      console.warn(`⚠️ ${apiPath} skipped — file not found: ${routeFile}`);
    }
  } catch (err) {
    console.error(`❌ Error loading ${apiPath}:`, err.message);
  }
};

loadRoute("routes/auth.js", "/api/auth");
loadRoute("routes/faculty.js", "/api/faculty");
loadRoute("routes/selection.js", "/api/selection");
loadRoute("routes/semester.js", "/api/semester");
loadRoute("routes/timetable.js", "/api/timetable");
loadRoute("routes/studentTimetable.js", "/api/student-timetable");
loadRoute("routes/adminTimetable.js", "/api/admin-timetable");

console.log("📦 Route loading complete");

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", version: "2.0.0", uptime: process.uptime() });
});

// ── Fallback ──
app.use((req, res) => {
  if (!req.path.startsWith("/api")) {
    const loginPath = path.join(FRONTEND_PATH, "login.html");
    if (fs.existsSync(loginPath)) {
      res.sendFile(loginPath);
    } else {
      res.status(404).json({ error: "login.html not found", path: loginPath });
    }
  } else {
    res.status(404).json({ error: "API endpoint not found", path: req.path });
  }
});

// ── Config ──
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/facultysync";
const PORT = process.env.PORT || 3000;

// ── MongoDB Connection ──
const connectDB = async () => {
  try {
    console.log("🔗 Connecting to MongoDB...");
    console.log("🔗 URI:", MONGO_URI.replace(/\/\/.*@/, "//<credentials>@")); // hide password

    await mongoose.connect(MONGO_URI); // no extra options needed in Mongoose 7+

    console.log("✅ MongoDB Connected Successfully");

    app.listen(PORT, () => {
      console.log(`🔥 Server running → http://localhost:${PORT}`);
      console.log(`📁 Frontend: ${FRONTEND_PATH}`);
      console.log(`🌍 Mode: ${process.env.NODE_ENV || "development"}`);
    });
  } catch (error) {
    console.error("❌ MongoDB CONNECTION ERROR:", error.message);
    console.error("Full error:", error);
    console.log("⚠️ Starting server WITHOUT database...");

    app.listen(PORT, () => {
      console.log(`🔥 Server running WITHOUT DB → http://localhost:${PORT}`);
    });
  }
};

connectDB();

// ── Catch ALL unhandled errors (prevents silent failures) ──
process.on("uncaughtException", (err) => {
  console.error("💥 Uncaught Exception:", err);
});

process.on("unhandledRejection", (reason) => {
  console.error("💥 Unhandled Promise Rejection:", reason);
});

// ── Graceful shutdown ──
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down...");
  await mongoose.disconnect();
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Terminated...");
  await mongoose.disconnect();
  process.exit(0);
});