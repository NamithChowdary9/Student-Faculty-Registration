const router  = require("express").Router();
const Faculty = require("../models/Faculty");
const { auth, adminOnly } = require("../middleware/authMiddleware");

/* ── GET (with filters) ── */
router.get("/", auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.year)       filter.year       = req.query.year;
    if (req.query.semester)   filter.semester   = req.query.semester;
    if (req.query.subject)    filter.subject    = req.query.subject;

    const list = await Faculty.find(filter).sort({ subject: 1, name: 1 });
    res.json(list);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── ADD ── */
router.post("/", auth, adminOnly, async (req, res) => {
  try {
    const {
      name, department, year, semester, subject,
      experience, rating, email, periodsPerWeek, studentLimit,
    } = req.body;

    if (!name || !department || !year || !semester || !subject)
      return res.status(400).json({ message: "name, department, year, semester, subject are required" });

    const f = await Faculty.create({
      name, department, year, semester, subject,
      experience:     experience     || "",
      rating:         rating != null  ? parseFloat(rating) : null,
      email:          email          || "",
      periodsPerWeek: periodsPerWeek ? parseInt(periodsPerWeek) : 4,
      studentLimit:   studentLimit   ? parseInt(studentLimit)   : 60,
    });

    res.status(201).json(f);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── UPDATE ── */
router.put("/:id", auth, adminOnly, async (req, res) => {
  try {
    // Sanitise numeric fields before update
    const update = { ...req.body };
    if (update.rating       != null) update.rating       = parseFloat(update.rating);
    if (update.periodsPerWeek != null) update.periodsPerWeek = parseInt(update.periodsPerWeek);
    if (update.studentLimit != null) update.studentLimit = parseInt(update.studentLimit);

    const f = await Faculty.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
    if (!f) return res.status(404).json({ message: "Faculty not found" });
    res.json(f);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── DELETE ── */
router.delete("/:id", auth, adminOnly, async (req, res) => {
  try {
    const f = await Faculty.findByIdAndDelete(req.params.id);
    if (!f) return res.status(404).json({ message: "Faculty not found" });
    res.json({ message: "Faculty deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;