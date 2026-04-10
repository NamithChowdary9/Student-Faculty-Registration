// backend/models/AuditLog.js
const mongoose = require("mongoose");

// Prevent model recompilation error in dev
if (mongoose.models.AuditLog) {
  module.exports = mongoose.models.AuditLog;
} else {
  const AuditLogSchema = new mongoose.Schema({
    adminId:   { type: String, required: true },
    studentId: { type: String, required: true },
    action: {
      type: String,
      enum: ["TIMETABLE_EDIT", "REQUEST_APPROVED", "REQUEST_REJECTED", "TIMETABLE_UNLOCK"],
      required: true,
    },
    details: {
      previousValue: mongoose.Schema.Types.Mixed,
      updatedValue:  mongoose.Schema.Types.Mixed,
      requestId:     String,
      note:          String,
    },
    timestamp: { type: Date, default: Date.now },
  }, { timestamps: true });

  module.exports = mongoose.model("AuditLog", AuditLogSchema);
}