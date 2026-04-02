const router = require("express").Router();
const SemesterStatus = require("../models/SemesterStatus");
const { auth, adminOnly } = require("../middleware/authMiddleware");

/* ── GET all statuses (optionally filtered) ── */
router.get("/", auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.year) filter.year = parseInt(req.query.year);
    if (req.query.semester) filter.semester = parseInt(req.query.semester);

    const list = await SemesterStatus.find(filter).sort({
      department: 1,
      year: 1,
      semester: 1,
    });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── GET check single combo ── */
router.get("/check", auth, async (req, res) => {
  try {
    const { department, year, semester } = req.query;
    if (!department || !year || !semester) {
      return res.status(400).json({ message: "department, year, semester required" });
    }

    const s = await SemesterStatus.findOne({
      department,
      year: parseInt(year),
      semester: parseInt(semester),
    });

    res.json({
      isLocked: s ? s.isLocked : true,
      minSgpa: s ? s.minSgpa : 0,
      exists: !!s,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── POST create/update status ── */
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const { department, year, semester, isLocked, minSgpa } = req.body;
    if (!department || !year || !semester) {
      return res.status(400).json({ message: "department, year, semester required" });
    }

    // Mongoose 7 uses `new: true` (not `returnDocument`)
    const status = await SemesterStatus.findOneAndUpdate(
      {
        department,
        year: parseInt(year),
        semester: parseInt(semester),
      },
      {
        isLocked: isLocked !== undefined ? isLocked : true,
        lockedBy: req.user.userId,
        lockedAt: new Date(),
        minSgpa: minSgpa != null ? parseFloat(minSgpa) : 0,
      },
      { upsert: true, new: true }
    );

    res.json(status);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── PATCH toggle lock ── */
router.patch("/:id/toggle", auth, adminOnly, async (req, res) => {
  try {
    const s = await SemesterStatus.findById(req.params.id);
    if (!s) {
      return res.status(404).json({ message: "Semester status not found" });
    }

    s.isLocked = !s.isLocked;
    s.lockedBy = req.user.userId;
    s.lockedAt = new Date();
    await s.save();

    res.json(s);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;