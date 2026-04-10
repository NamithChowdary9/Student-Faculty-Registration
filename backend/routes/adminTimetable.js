// ═══════════════════════════════════════════════════════
// routes/adminTimetable.js
// Mount at: app.use("/api/admin-timetable", require("./routes/adminTimetable"))
// Requires admin role on all routes
// ═══════════════════════════════════════════════════════

const express = require("express");
const router = express.Router();
const StudentTimetable = require("../models/StudentTimetable");
const ChangeRequest = require("../models/ChangeRequest");
const AuditLog = require("../models/AuditLog");
const { auth, adminOnly } = require("../middleware/authMiddleware");

// ══════════════════════════════════════════════
// GET /api/admin-timetable/student/:regNo
// Search student timetable by registration number
// ══════════════════════════════════════════════
router.get("/student/:regNo", auth, adminOnly, async (req, res) => {
  try {
    const tt = await StudentTimetable.findOne({ studentId: req.params.regNo });
    if (!tt) return res.status(404).json({ message: "No timetable found for this student.", exists: false });
    return res.json(tt);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// ══════════════════════════════════════════════
// GET /api/admin-timetable/requests
// All change requests (optionally filter by status)
// ══════════════════════════════════════════════
router.get("/requests", auth, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.status) filter.status = req.query.status;
    if (req.query.studentId) filter.studentId = req.query.studentId;
    const requests = await ChangeRequest.find(filter).sort({ createdAt: -1 });
    return res.json(requests);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// ══════════════════════════════════════════════
// PATCH /api/admin-timetable/requests/:id/handle
// Accept or reject a change request + add remark
// ══════════════════════════════════════════════
router.patch("/requests/:id/handle", auth, adminOnly, async (req, res) => {
  try {
    const { status, adminRemark } = req.body;
    if (!["approved","rejected"].includes(status)) {
      return res.status(400).json({ message: "Status must be 'approved' or 'rejected'." });
    }

    const request = await ChangeRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: "Request not found." });
    if (request.status !== "pending") {
      return res.status(409).json({ message: "Request already handled." });
    }

    request.status = status;
    request.adminRemark = adminRemark || "";
    request.handledBy = req.user.userId;
    request.handledAt = new Date();
    await request.save();

    // If approved → unlock timetable so admin can edit
    if (status === "approved") {
      await StudentTimetable.updateOne(
        { studentId: request.studentId },
        { locked: false, updatedAt: new Date() }
      );
    }

    // ── AUDIT LOG ────────────────────────────────────
    await AuditLog.create({
      adminId: req.user.userId,
      studentId: request.studentId,
      action: status === "approved" ? "REQUEST_APPROVED" : "REQUEST_REJECTED",
      details: {
        requestId: request._id.toString(),
        note: adminRemark || "",
        previousValue: { status: "pending" },
        updatedValue: { status },
      },
    });

    return res.json({ message: `Request ${status}.`, request });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// ══════════════════════════════════════════════
// PUT /api/admin-timetable/edit/:studentId
// Admin edits a student's timetable (only if request approved or override)
// ══════════════════════════════════════════════
router.put("/edit/:studentId", auth, adminOnly, async (req, res) => {
  try {
    const { studentId } = req.params;
    const { slots, reason } = req.body;

    const tt = await StudentTimetable.findOne({ studentId });
    if (!tt) return res.status(404).json({ message: "No timetable found." });

    // Check: must have an approved request OR admin explicitly passes override flag
    const hasApprovedReq = await ChangeRequest.findOne({ studentId, status: "approved" });
    if (!hasApprovedReq && !req.body.adminOverride) {
      return res.status(403).json({
        message: "Cannot edit: No approved change request exists for this student.",
      });
    }

    const previousSlots = tt.slots;
    tt.slots = slots;
    tt.locked = true; // re-lock after edit
    tt.updatedAt = new Date();
    await tt.save();

    // ── AUDIT LOG ────────────────────────────────────
    await AuditLog.create({
      adminId: req.user.userId,
      studentId,
      action: "TIMETABLE_EDIT",
      details: {
        note: reason || "Admin edit",
        previousValue: previousSlots,
        updatedValue: slots,
      },
    });

    return res.json({ message: "Timetable updated and re-locked.", timetable: tt });
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

// ══════════════════════════════════════════════
// GET /api/admin-timetable/audit-logs
// View audit logs (filter by studentId or adminId)
// ══════════════════════════════════════════════
router.get("/audit-logs", auth, adminOnly, async (req, res) => {
  try {
    const filter = {};
    if (req.query.studentId) filter.studentId = req.query.studentId;
    if (req.query.adminId) filter.adminId = req.query.adminId;
    const logs = await AuditLog.find(filter).sort({ timestamp: -1 }).limit(200);
    return res.json(logs);
  } catch (err) {
    return res.status(500).json({ message: "Server error." });
  }
});

module.exports = router;
