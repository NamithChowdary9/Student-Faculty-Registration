const express = require("express");
const router  = express.Router();

const StudentTimetable = require("../models/StudentTimetable");
const ChangeRequest    = require("../models/ChangeRequest");

let Faculty;
try { Faculty = require("../models/Faculty"); } catch(e) {}

const { auth } = require("../middleware/authMiddleware");

/* ── GET /api/student-timetable/:studentId ── */
router.get("/:studentId", auth, async (req, res) => {
  try {
    const tt = await StudentTimetable.findOne({ studentId: req.params.studentId });
    if (!tt) return res.status(404).json({ message: "No timetable found.", exists: false });
    return res.json(tt);
  } catch (err) {
    return res.status(500).json({ message: "Server error: " + err.message });
  }
});

/* ── POST /api/student-timetable/save ── */
router.post("/save", auth, async (req, res) => {
  try {
    const { studentId, department, year, semester, slots } = req.body;

    if (!studentId)  return res.status(400).json({ message: "studentId is required." });
    if (!department) return res.status(400).json({ message: "department is required." });
    if (!year)       return res.status(400).json({ message: "year is required." });
    if (!semester)   return res.status(400).json({ message: "semester is required." });
    if (!slots || !Array.isArray(slots) || slots.length === 0)
      return res.status(400).json({ message: "slots array is required and cannot be empty." });

    // Block re-save if already locked
    const existing = await StudentTimetable.findOne({ studentId });
    if (existing && existing.locked)
      return res.status(409).json({ message: "Timetable already saved and locked." });

    // Validate all subjects from faculty are covered
    if (Faculty) {
      try {
        const facultyDocs = await Faculty.find({
          department, year: parseInt(year), semester: parseInt(semester),
        });
        if (facultyDocs.length > 0) {
          const required = [...new Set(facultyDocs.map(f => f.subject))];
          const assigned = [...new Set(slots.map(s => s.subject))];
          const missing  = required.filter(s => !assigned.includes(s));
          if (missing.length > 0)
            return res.status(400).json({ message: `Missing subjects: ${missing.join(", ")}`, missing });
        }
      } catch (fe) {
        console.warn("⚠️ Faculty validation skipped:", fe.message);
      }
    }

    // No duplicate subject on same day
    const seen = {};
    for (const slot of slots) {
      const key = `${slot.day}-${slot.subject}`;
      if (seen[key])
        return res.status(400).json({ message: `Duplicate subject "${slot.subject}" on ${slot.day}.` });
      seen[key] = true;
    }

    const tt = await StudentTimetable.findOneAndUpdate(
      { studentId },
      { studentId, department, year: parseInt(year), semester: parseInt(semester), slots, locked: true },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    return res.json({ message: "Timetable saved successfully.", timetable: tt });
  } catch (err) {
    return res.status(500).json({ message: "Server error: " + err.message });
  }
});

/* ── POST /api/student-timetable/request ── */
router.post("/request", auth, async (req, res) => {
  try {
    const { studentId, reason, periods } = req.body;

    if (!studentId || !reason || !periods || !periods.length)
      return res.status(400).json({ message: "studentId, reason and periods are required." });

    const pending = await ChangeRequest.findOne({ studentId, status: "pending" });
    if (pending)
      return res.status(409).json({
        message: "You already have a pending request. Wait for admin to respond.",
        requestId: pending._id,
      });

    const request = await ChangeRequest.create({ studentId, reason, periods });
    return res.json({ message: "Request submitted successfully.", request });
  } catch (err) {
    return res.status(500).json({ message: "Server error: " + err.message });
  }
});

/* ── GET /api/student-timetable/requests/:studentId ── */
router.get("/requests/:studentId", auth, async (req, res) => {
  try {
    const requests = await ChangeRequest.find({ studentId: req.params.studentId })
      .sort({ createdAt: -1 });
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ message: "Server error: " + err.message });
  }
});

module.exports = router;