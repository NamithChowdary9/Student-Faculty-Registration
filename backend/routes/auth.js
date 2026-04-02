const router = require("express").Router();
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { auth, adminOnly } = require("../middleware/authMiddleware");

const SECRET = process.env.JWT_SECRET || "facultysync_secret_2025";

/* ── Helper: parse year-of-study from reg number ── */
function parseYear(userId) {
  const prefix = parseInt(userId.substring(0, 2), 10);
  if (isNaN(prefix)) return null;
  const currentSuffix = new Date().getFullYear() % 100;
  return Math.max(1, Math.min(4, currentSuffix - prefix + 1));
}

/* ── POST /api/auth/login ── */
router.post("/login", async (req, res) => {
  try {
    const { userId, password, role } = req.body;
    if (!userId || !password || !role)
      return res.status(400).json({ message: "userId, password and role are required" });

    const user = await User.findOne({ userId: userId.toUpperCase(), role });
    if (!user)
      return res.status(401).json({ message: "User not found or wrong role selected" });

    if (!user.isActive)
      return res.status(403).json({ message: "Account is inactive. Contact admin." });

    let valid = false;
    if (user.password.startsWith("$2")) {
      valid = await bcrypt.compare(password, user.password);
    } else {
      valid = password === user.password;
    }

    if (!valid)
      return res.status(401).json({ message: "Incorrect password" });

    const token = jwt.sign(
      {
        userId: user.userId,
        role: user.role,
        department: user.department,
        year: user.yearOfStudy,
      },
      SECRET,
      { expiresIn: "12h" }
    );

    res.json({
      token,
      role: user.role,
      userId: user.userId,
      department: user.department,
      year: user.yearOfStudy,
      name: user.name,
      sgpa: user.sgpa,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── POST /api/auth/user ── */
router.post("/user", auth, adminOnly, async (req, res) => {
  try {
    const { userId, password, role, department, name, email, sgpa } = req.body;
    if (!userId || !password || !role)
      return res.status(400).json({ message: "userId, password and role are required" });

    const year = parseYear(userId);
    // Always hash passwords for security
    const stored = await bcrypt.hash(password, 10);

    const user = await User.create({
      userId: userId.toUpperCase(),
      password: stored,
      role,
      department: department || "",
      yearOfStudy: year,
      sgpa: sgpa != null ? parseFloat(sgpa) : null,
      name: name || "",
      email: email || "",
    });

    res.status(201).json({ message: "User created", userId: user.userId });
  } catch (e) {
    if (e.code === 11000)
      return res.status(409).json({ message: "User ID already exists" });
    res.status(500).json({ message: e.message });
  }
});

/* ── POST /api/auth/seed-students ── */
router.post("/seed-students", auth, adminOnly, async (req, res) => {
  try {
    const { yearPrefix, department, count } = req.body;
    if (!yearPrefix || !department)
      return res.status(400).json({ message: "yearPrefix and department required" });

    const yr = String(yearPrefix).padStart(2, "0");
    const total = Math.min(parseInt(count) || 300, 500);
    const currentSuffix = new Date().getFullYear() % 100;
    const yearOfStudy = Math.max(1, Math.min(4, currentSuffix - parseInt(yr) + 1));

    let inserted = 0, skipped = 0;
    for (let i = 1; i <= total; i++) {
      const last5 = String(4000 + i).padStart(5, "0");
      const regNo = `${yr}1FA${last5}`.toUpperCase();
      const password = regNo.slice(-3); // plain — students use last 3 digits

      try {
        await User.create({
          userId: regNo,
          password, // stored plain; compared plain on login
          role: "student",
          department,
          yearOfStudy,
          isActive: true,
        });
        inserted++;
      } catch {
        skipped++;
      }
    }

    res.json({
      message: `Seeded ${inserted} students (${skipped} skipped — already exist)`,
      inserted,
      skipped,
      sample: `${yr}1FA04001 – ${yr}1FA0${4000 + total}`,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── GET /api/auth/users ── */
router.get("/users", auth, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.department) filter.department = req.query.department;
    if (req.query.year) filter.yearOfStudy = parseInt(req.query.year);

    const users = await User.find(filter)
      .select("-password")
      .sort({ userId: 1 })
      .limit(500);

    res.json(users);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── POST /api/auth/bulk-sgpa ── */
router.post("/bulk-sgpa", auth, adminOnly, async (req, res) => {
  try {
    const { records } = req.body;
    if (!Array.isArray(records) || !records.length)
      return res.status(400).json({ message: "records array required" });

    let updated = 0;
    for (const r of records) {
      if (r.userId && !isNaN(r.sgpa)) {
        await User.updateOne(
          { userId: r.userId.toUpperCase() },
          { sgpa: parseFloat(r.sgpa) }
        );
        updated++;
      }
    }

    res.json({ message: `Updated SGPA for ${updated} students` });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── DELETE /api/auth/user/:userId ── */
router.delete("/user/:userId", auth, adminOnly, async (req, res) => {
  try {
    await User.deleteOne({ userId: req.params.userId.toUpperCase() });
    res.json({ message: "User deleted" });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;