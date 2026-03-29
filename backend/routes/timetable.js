const router       = require("express").Router();
const Faculty      = require("../models/Faculty");
const Selection    = require("../models/Selection");
const { Room, TimetableSlot, RoomAllocation } = require("../models/Timetable");
const { auth, adminOnly } = require("../middleware/authMiddleware");

// nodemailer is optional — only used if SMTP is configured
let nodemailer;
try { nodemailer = require("nodemailer"); } catch { nodemailer = null; }

const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const PERIODS = [
  { num: 1, start: "09:00", end: "10:00" },
  { num: 2, start: "10:00", end: "11:00" },
  { num: 3, start: "11:15", end: "12:15" },
  { num: 4, start: "13:00", end: "14:00" },
  { num: 5, start: "14:00", end: "15:00" },
];

/* ── GENERATE timetable ── */
router.post("/generate", auth, adminOnly, async (req, res) => {
  try {
    const { department, year, semester } = req.body;
    if (!department || !year || !semester)
      return res.status(400).json({ message: "department, year, semester required" });

    // Clear old data
    await TimetableSlot.deleteMany({ department, year, semester });
    await RoomAllocation.deleteMany({ department, year, semester });

    const faculties = await Faculty.find({ department, year, semester });
    if (!faculties.length)
      return res.status(404).json({ message: "No faculty found for this combination" });

    // Load rooms — auto-create defaults if none exist
    let rooms = await Room.find({ isActive: true }).sort({ roomNumber: 1 });
    if (!rooms.length) {
      const defaults = [];
      for (let i = 1; i <= 20; i++)
        defaults.push({
          roomNumber: `R${String(i).padStart(3, "0")}`,
          capacity: 60,
          block: "A",
          floor: Math.ceil(i / 5),
        });
      rooms = await Room.insertMany(defaults);
    }

    // Build faculty → [studentIds] map
    const allSelections = await Selection.find({ department, year, semester });
    const facStudents   = {};
    faculties.forEach((f) => { facStudents[f._id.toString()] = []; });
    allSelections.forEach((sel) =>
      sel.selections.forEach((s) => {
        const k = s.facultyId?.toString();
        if (k && facStudents[k]) facStudents[k].push(sel.studentId);
      })
    );

    const slots = [], allocs = [];
    let roomIdx = 0;

    for (const fac of faculties) {
      const totalPeriods = fac.periodsPerWeek || 4;
      const studentIds   = facStudents[fac._id.toString()] || [];
      const studentCount = studentIds.length;
      const room         = rooms[roomIdx % rooms.length];
      roomIdx++;

      const dayCount = {};
      DAYS.forEach((d) => { dayCount[d] = 0; });
      let scheduled = 0;

      for (const day of DAYS) {
        if (scheduled >= totalPeriods) break;
        for (const p of PERIODS) {
          if (scheduled >= totalPeriods) break;
          if (dayCount[day] >= 4) break; // max 4 classes/day per faculty

          slots.push({
            department, year, semester,
            facultyId:    fac._id,
            facultyName:  fac.name,
            subject:      fac.subject,
            day,
            periodNumber: p.num,
            startTime:    p.start,
            endTime:      p.end,
            roomNumber:   room.roomNumber,
            studentIds,
            studentCount,
          });

          allocs.push({
            department, year, semester,
            subject:      fac.subject,
            facultyId:    fac._id,
            facultyName:  fac.name,
            roomNumber:   room.roomNumber,
            day,
            period:       p.num,
            studentCount,
          });

          dayCount[day]++;
          scheduled++;
        }
      }
    }

    await TimetableSlot.insertMany(slots);
    await RoomAllocation.insertMany(allocs);

    res.json({
      message:      `Timetable generated: ${slots.length} slots for ${faculties.length} faculty`,
      slotsCreated: slots.length,
      faculty:      faculties.length,
    });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── GET student timetable ── */
router.get("/student/:studentId", auth, async (req, res) => {
  try {
    const { department, year, semester } = req.query;
    if (!department || !year || !semester)
      return res.status(400).json({ message: "department, year, semester query params required" });

    const slots = await TimetableSlot.find({
      department,
      year,
      semester,
      studentIds: req.params.studentId,
    }).sort({ day: 1, periodNumber: 1 });

    res.json(slots);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── GET faculty timetable ── */
router.get("/faculty/:facultyId", auth, async (req, res) => {
  try {
    const slots = await TimetableSlot.find({ facultyId: req.params.facultyId })
      .sort({ day: 1, periodNumber: 1 });
    res.json(slots);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── GET all slots (admin view) ── */
router.get("/all", auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.year)       filter.year       = req.query.year;
    if (req.query.semester)   filter.semester   = req.query.semester;

    const slots = await TimetableSlot.find(filter).sort({ facultyName: 1, day: 1, periodNumber: 1 });
    res.json(slots);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── LIST rooms — MUST be before /rooms route to avoid :id collision ── */
router.get("/rooms/list", auth, async (req, res) => {
  try {
    const rooms = await Room.find().sort({ roomNumber: 1 });
    res.json(rooms);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── ADD room ── */
router.post("/rooms/add", auth, adminOnly, async (req, res) => {
  try {
    const { roomNumber, capacity, block, floor } = req.body;
    if (!roomNumber) return res.status(400).json({ message: "roomNumber required" });

    const room = await Room.create({
      roomNumber,
      capacity: capacity ? parseInt(capacity) : 60,
      block:    block    || "A",
      floor:    floor    ? parseInt(floor)    : 1,
    });
    res.status(201).json(room);
  } catch (e) {
    if (e.code === 11000) return res.status(409).json({ message: "Room already exists" });
    res.status(500).json({ message: e.message });
  }
});

/* ── GET room allocations ── */
router.get("/rooms", auth, async (req, res) => {
  try {
    const filter = {};
    if (req.query.department) filter.department = req.query.department;
    if (req.query.year)       filter.year       = req.query.year;
    if (req.query.semester)   filter.semester   = req.query.semester;

    const allocs = await RoomAllocation.find(filter).sort({ day: 1, period: 1, roomNumber: 1 });
    res.json(allocs);
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

/* ── MAIL faculty timetables ── */
router.post("/mail-faculty", auth, adminOnly, async (req, res) => {
  try {
    if (!nodemailer)
      return res.status(500).json({ message: "nodemailer is not installed. Run: npm install nodemailer" });

    if (!process.env.SMTP_USER || !process.env.SMTP_PASS)
      return res.status(400).json({ message: "SMTP not configured in .env file" });

    const { department, year, semester } = req.body;
    if (!department || !year || !semester)
      return res.status(400).json({ message: "department, year, semester required" });

    const faculties = await Faculty.find({ department, year, semester, email: { $ne: "" } });
    if (!faculties.length)
      return res.status(404).json({ message: "No faculty with email found" });

    const transporter = nodemailer.createTransport({
      host:   process.env.SMTP_HOST || "smtp.gmail.com",
      port:   parseInt(process.env.SMTP_PORT || "587"),
      secure: false,
      auth:   { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    });

    let sent = 0;
    for (const fac of faculties) {
      const slots = await TimetableSlot.find({ facultyId: fac._id }).sort({ day: 1, periodNumber: 1 });
      if (!slots.length) continue;

      const rows = slots.map((s) =>
        `<tr style="border-bottom:1px solid #eee">
          <td style="padding:8px 12px">${s.day}</td>
          <td style="padding:8px 12px">Period ${s.periodNumber} (${s.startTime}–${s.endTime})</td>
          <td style="padding:8px 12px">${s.subject}</td>
          <td style="padding:8px 12px;font-weight:bold">${s.roomNumber}</td>
          <td style="padding:8px 12px">${s.studentCount} students</td>
        </tr>`
      ).join("");

      await transporter.sendMail({
        from:    `FacultySync <${process.env.SMTP_USER}>`,
        to:      fac.email,
        subject: `Your Timetable — ${department} Sem ${semester}`,
        html: `
          <div style="font-family:sans-serif;max-width:600px">
            <h2 style="color:#4f8ef7">FacultySync — Your Timetable</h2>
            <p>Dear <strong>${fac.name}</strong>,</p>
            <p>Your timetable for <strong>${department} Year ${year} Semester ${semester}</strong> is ready.</p>
            <table style="width:100%;border-collapse:collapse;margin-top:16px">
              <thead><tr style="background:#f0f4ff">
                <th style="padding:10px 12px;text-align:left">Day</th>
                <th style="padding:10px 12px;text-align:left">Period / Time</th>
                <th style="padding:10px 12px;text-align:left">Subject</th>
                <th style="padding:10px 12px;text-align:left">Room</th>
                <th style="padding:10px 12px;text-align:left">Students</th>
              </tr></thead>
              <tbody>${rows}</tbody>
            </table>
            <p style="margin-top:24px;color:#888">— FacultySync System</p>
          </div>`,
      });
      sent++;
    }

    res.json({ message: `Timetable emailed to ${sent} faculty member${sent !== 1 ? "s" : ""}` });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
});

module.exports = router;