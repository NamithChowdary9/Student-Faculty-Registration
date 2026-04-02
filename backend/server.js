require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const path = require("path");
const fs = require("fs");

const app = express();

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Absolute path to frontend folder
const FRONTEND_PATH = path.resolve(__dirname, "../frontend");

// ── Serve frontend files ──
app.use(express.static(FRONTEND_PATH));

// ── API Routes ──
try {
  app.use("/api/auth", require("./routes/auth"));
  app.use("/api/faculty", require("./routes/faculty"));
  app.use("/api/selection", require("./routes/selection"));

  if (fs.existsSync(path.join(__dirname, "routes/semester.js"))) {
    app.use("/api/semester", require("./routes/semester"));
    console.log("✅ /api/semester routes loaded");
  } else {
    console.warn("⚠️ /api/semester routes skipped (file not found)");
  }

  if (fs.existsSync(path.join(__dirname, "routes/timetable.js"))) {
    app.use("/api/timetable", require("./routes/timetable"));
    console.log("✅ /api/timetable routes loaded");
  } else {
    console.warn("⚠️ /api/timetable routes skipped (file not found)");
  }

  console.log("✅ All API routes loaded successfully");
} catch (err) {
  console.warn("⚠️ Some routes not loaded:", err.message);
}

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "2.0.0",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// ── Fallback → send login page for non-API routes ──
app.use((req, res) => {
  if (!req.path.startsWith("/api")) {
    const loginPath = path.join(FRONTEND_PATH, "login.html");
    if (fs.existsSync(loginPath)) {
      res.sendFile(loginPath);
    } else {
      res.status(404).json({ error: "login.html not found" });
    }
  } else {
    res.status(404).json({ error: "API endpoint not found" });
  }
});

// ── MongoDB & Server Start ──
const MONGO_URI =
  process.env.MONGO_URI || "mongodb://127.0.0.1:27017/facultysync";
const PORT = process.env.PORT || 3000;

const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
};

mongoose
  .connect(MONGO_URI, mongoOptions)
  .then(() => {
    console.log("✅ MongoDB connected to:", MONGO_URI);
    app.listen(PORT, () => {
      console.log(`🚀 FacultySync v2.0 running → http://localhost:${PORT}`);
      console.log(`📁 Serving frontend from: ${FRONTEND_PATH}`);
      console.log(`🔧 Environment: ${process.env.NODE_ENV || "development"}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB connection failed:", err.message);
    console.error("💡 Please make sure MongoDB is running: mongod");
    process.exit(1);
  });

// ── Graceful shutdown ──
process.on("SIGINT", async () => {
  console.log("\n🛑 Shutting down gracefully...");
  await mongoose.disconnect();
  console.log("✅ MongoDB disconnected");
  process.exit(0);
});

process.on("SIGTERM", async () => {
  console.log("\n🛑 Received SIGTERM, shutting down...");
  await mongoose.disconnect();
  console.log("✅ MongoDB disconnected");
  process.exit(0);
});