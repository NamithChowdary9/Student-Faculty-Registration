require("dotenv").config();
const express  = require("express");
const cors     = require("cors");
const mongoose = require("mongoose");
const path     = require("path");

const app = express();

app.use(cors());
app.use(express.json({ limit: "10mb" }));

// ── Serve all HTML files from frontend folder ──
app.use(express.static(path.join(__dirname, "../frontend")));

// ── API Routes ──
app.use("/api/auth",      require("./routes/auth"));
app.use("/api/faculty",   require("./routes/faculty"));
app.use("/api/selection", require("./routes/selection"));
app.use("/api/semester",  require("./routes/semester"));
app.use("/api/timetable", require("./routes/timetable"));

// ── Health check ──
app.get("/api/health", (_, res) =>
  res.json({ status: "ok", version: "2.0.0", time: new Date() })
);

// ── Fallback → login page ──
app.use((req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/login.html"));
});

// ── Connect MongoDB & Start ──
const MONGO_URI = process.env.MONGO_URI || "mongodb://localhost:27017/facultysync";
const PORT      = process.env.PORT || 3000;

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log("✅ MongoDB connected:", MONGO_URI);
    app.listen(PORT, () =>
      console.log(`🚀 FacultySync v2.0 running → http://localhost:${PORT}`)
    );
  })
  .catch((e) => {
    console.error("❌ MongoDB failed:", e.message);
    console.log("💡 Start MongoDB: mongod --dbpath ~/data/db");
    process.exit(1);
  });
