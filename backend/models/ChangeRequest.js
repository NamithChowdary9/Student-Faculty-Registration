// backend/models/ChangeRequest.js
const mongoose = require("mongoose");

// Prevent model recompilation error in dev
if (mongoose.models.ChangeRequest) {
  module.exports = mongoose.models.ChangeRequest;
} else {
  const ChangeRequestSchema = new mongoose.Schema({
    studentId: { type: String, required: true, index: true },
    reason:    { type: String, required: true },
    periods: [{
      day:     { type: String },
      period:  { type: Number },
      subject: { type: String },
    }],
    status:      { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
    adminRemark: { type: String, default: "" },
    handledBy:   { type: String, default: "" },
    handledAt:   { type: Date },
  }, { timestamps: true });

  module.exports = mongoose.model("ChangeRequest", ChangeRequestSchema);
}