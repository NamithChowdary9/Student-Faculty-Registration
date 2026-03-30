require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");
const path     = require("path");

const app = express();

// ── Middleware ──
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ✅ Absolute path to frontend folder
const FRONTEND_PATH = path.resolve(__dirname, "../frontend");

// ── Serve frontend files ──
app.use(express.static(FRONTEND_PATH));

// ── API Routes ──
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/faculty",   require("./routes/faculty"));
app.use("/api/selection", require("./routes/selection"));
app.use("/api/semester",  require("./routes/semester"));
app.use("/api/timetable", require("./routes/timetable"));

// ── Health check ──
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    version: "2.0.0",
    time: new Date()
  });
});

// ── Fallback → Always send login page ──
app.use((req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, "login.html"));
});

// ── MongoDB & Server Start ──
const MONGO_URI = process.env.MONGO_URI || "mongodb://127.0.0.1:27017/facultysync";
const PORT      = process.env.PORT || 3000;

mongoose.connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running at: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error("❌ MongoDB failed:", err.message);
    process.exit(1);
  });