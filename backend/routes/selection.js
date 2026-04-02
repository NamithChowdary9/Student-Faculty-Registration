const router = require("express").Router();
const Selection = require("../models/Selection");
const Faculty = require("../models/Faculty");
const SemesterStatus = require("../models/SemesterStatus");
const User = require("../models/User");
const { auth, adminOnly, studentOnly } = require("../middleware/authMiddleware");

/* ── GET student's own selection ── */
router.get("/", auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId) filter.studentId = req.query.studentId;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.year) filter.year = parseInt(req.query.year);
    if (req.query.semester) filter.semester = parseInt(req.query.semester);

    const sels = await Selection.find(filter);
    res.json(sels);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── GET all selections (admin) ── */
router.get("/all", auth, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.year) filter.year = parseInt(req.query.year);
    if (req.query.semester) filter.semester = parseInt(req.query.semester);

    const sels = await Selection.find(filter).sort({ studentId: 1 });
    res.json(sels);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── POST — submit/update selection ── */
router.post("/", auth, studentOnly, async (req, res) => {
  try {
    const { studentId, department, year, semester, selections } = req.body;

    if (!studentId || !department || !year || !semester || !Array.isArray(selections) || !selections.length)
      return res.status(400).json({
        message: "studentId, department, year, semester and selections are required",
      });

    const numYear = parseInt(year);
    const numSem = parseInt(semester);

    // 1. Verify semester is unlocked
    const semStatus = await SemesterStatus.findOne({
      department,
      year: numYear,
      semester: numSem,
    });

    if (!semStatus || semStatus.isLocked)
      return res.status(403).json({
        message:
          "This semester is currently locked for registration. Please wait for admin to unlock it.",
      });

    // 2. Verify student SGPA if minimum is set
    if (semStatus.minSgpa > 0) {
      const student = await User.findOne({ userId: studentId });
      const sgpa = student?.sgpa ?? null;
      if (sgpa !== null && sgpa < semStatus.minSgpa)
        return res.status(403).json({
          message: `Your SGPA (${sgpa}) does not meet the minimum requirement of ${semStatus.minSgpa} for this semester.`,
        });
    }

    // 3. Validate each faculty — check enrollment limit
    const enriched = [];
    const existingDoc = await Selection.findOne({
      studentId,
      department,
      year: numYear,
      semester: numSem,
    });

    for (const sel of selections) {
      if (!sel.facultyId)
        return res.status(400).json({ message: `facultyId missing for subject: ${sel.subject}` });

      const fac = await Faculty.findById(sel.facultyId);
      if (!fac)
        return res.status(404).json({ message: `Faculty not found for subject: ${sel.subject}` });

      // Only block if this student hasn't already registered for this faculty
      const alreadyIn = existingDoc?.selections?.some(
        (s) => s.facultyId?.toString() === fac._id.toString()
      );

      if (!alreadyIn && fac.enrolledCount >= fac.studentLimit)
        return res.status(409).json({
          message: `Faculty "${fac.name}" (${fac.subject}) has reached the maximum student limit of ${fac.studentLimit}. Please choose a different faculty.`,
        });

      enriched.push({
        subject: sel.subject,
        facultyId: fac._id,
        facultyName: fac.name,
        roomNumber: sel.roomNumber || "",
      });
    }

    // 4. Upsert selection — if updating, adjust enrolled counts
    if (existingDoc) {
      // Decrement old enrollments
      for (const old of existingDoc.selections) {
        await Faculty.findByIdAndUpdate(old.facultyId, { $inc: { enrolledCount: -1 } });
      }
      existingDoc.selections = enriched;
      existingDoc.isFinalized = false;
      await existingDoc.save();
    } else {
      await Selection.create({
        studentId,
        department,
        year: numYear,
        semester: numSem,
        selections: enriched,
      });
    }

    // 5. Increment new enrollments
    for (const sel of enriched) {
      await Faculty.findByIdAndUpdate(sel.facultyId, { $inc: { enrolledCount: 1 } });
    }

    res.json({ message: "Selection saved successfully" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;