// ═══════════════════════════════════════════════════════
// routes/studentTimetable.js
// Mount at: app.use("/api/student-timetable", require("./routes/studentTimetable"))
// ═══════════════════════════════════════════════════════
const express = require("express");
const router  = express.Router();
const mongoose = require("mongoose");

// ── Import Models ──────────────────────────────────────
// Adjust the path to match your project structure
const StudentTimetable = require("../models/StudentTimetable");
const ChangeRequest    = require("../models/ChangeRequest");
const Faculty          = require("../models/Faculty");   // your existing Faculty model

// ── Auth middleware ────────────────────────────────────
// Adjust to match your existing JWT middleware
const { auth } = require("../middleware/auth");

// ══════════════════════════════════════════════
// GET  /api/student-timetable/:studentId
// Returns saved timetable (or null if not saved)
// ══════════════════════════════════════════════
router.get("/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;

    // Students can only fetch their own; admins can fetch any
    if (req.user.role !== "admin" && req.user.userId !== studentId) {
      return res.status(403).json({ message: "Access denied." });
    }

    const tt = await StudentTimetable.findOne({ studentId });
    if (!tt) return res.status(404).json({ message: "No timetable found.", exists: false });

    return res.json(tt);
  } catch (err) {
    console.error("GET timetable error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ══════════════════════════════════════════════
// POST /api/student-timetable/save
// Save + lock timetable (one-time only)
// ══════════════════════════════════════════════
router.post("/save", auth, async (req, res) => {
  try {
    const { studentId, department, year, semester, slots } = req.body;

    // Only the student themselves can save
    if (req.user.role !== "admin" && req.user.userId !== studentId) {
      return res.status(403).json({ message: "Access denied." });
    }

    // ── DUPLICATE SUBMISSION GUARD ──────────────────
    const existing = await StudentTimetable.findOne({ studentId });
    if (existing && existing.locked) {
      return res.status(409).json({ message: "Timetable already saved and locked. Cannot save again." });
    }

    // ── VALIDATE: all required subjects must be present ──
    const facultyDocs = await Faculty.find({ department, year, semester });
    const requiredSubjects = [...new Set(facultyDocs.map(f => f.subject))];

    if (requiredSubjects.length === 0) {
      return res.status(400).json({ message: "No subjects configured for this semester." });
    }

    const assignedSubjects = [...new Set(slots.map(s => s.subject))];
    const missingSubjects  = requiredSubjects.filter(s => !assignedSubjects.includes(s));

    if (missingSubjects.length > 0) {
      return res.status(400).json({
        message: `Missing subjects: ${missingSubjects.join(", ")}`,
        missing: missingSubjects,
      });
    }

    // ── VALIDATE: no duplicate subject on same day ──
    const daySubjectMap = {};
    for (const slot of slots) {
      const key = `${slot.day}-${slot.subject}`;
      if (daySubjectMap[key]) {
        return res.status(400).json({
          message: `Duplicate subject "${slot.subject}" on ${slot.day}.`,
        });
      }
      daySubjectMap[key] = true;
    }

    // ── SAVE & LOCK ─────────────────────────────────
    const tt = await StudentTimetable.findOneAndUpdate(
      { studentId },
      {
        studentId, department,
        year: parseInt(year),
        semester: parseInt(semester),
        slots,
        locked: true,
        updatedAt: new Date(),
      },
      { upsert: true, new: true }
    );

    return res.json({ message: "Timetable saved successfully.", timetable: tt });
  } catch (err) {
    console.error("Save timetable error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ══════════════════════════════════════════════
// POST /api/student-timetable/request
// Submit change request (idempotent)
// ══════════════════════════════════════════════
router.post("/request", auth, async (req, res) => {
  try {
    const { studentId, reason, periods } = req.body;

    if (req.user.role !== "admin" && req.user.userId !== studentId) {
      return res.status(403).json({ message: "Access denied." });
    }
    if (!reason || !periods || !periods.length) {
      return res.status(400).json({ message: "Reason and periods are required." });
    }

    // ── IDEMPOTENCY: block if pending request already exists ──
    const pendingExists = await ChangeRequest.findOne({ studentId, status: "pending" });
    if (pendingExists) {
      return res.status(409).json({
        message: "You already have a pending request. Wait for admin to respond.",
        requestId: pendingExists._id,
      });
    }

    const request = await ChangeRequest.create({ studentId, reason, periods });
    return res.json({ message: "Request submitted successfully.", request });
  } catch (err) {
    console.error("Submit request error:", err);
    return res.status(500).json({ message: "Server error." });
  }
});

// ══════════════════════════════════════════════
// GET  /api/student-timetable/requests/:studentId
// Student views their own requests
// ══════════════════════════════════════════════
router.get("/requests/:studentId", auth, async (req, res) => {
  try {
    const { studentId } = req.params;
    if (req.user.role !== "admin" && req.user.userId !== studentId) {
      return res.status(403).json({ message: "Access denied." });
    }
    const requests = await ChangeRequest.find({ studentId }).sort({ createdAt: -1 });
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;