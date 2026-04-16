const mongoose = require("mongoose");

const SlotSchema = new mongoose.Schema({
  day:     { type: String, required: true },
  period:  { type: Number, required: true },
  subject: { type: String, required: true },
}, { _id: false });

const StudentTimetableSchema = new mongoose.Schema({
  studentId:  { type: String, required: true, unique: true, index: true },
  department: { type: String, required: true },
  year:       { type: Number, required: true },
  semester:   { type: Number, required: true },
  slots:      [SlotSchema],
  locked:     { type: Boolean, default: false },
}, { timestamps: true });

module.exports = mongoose.model("StudentTimetable", StudentTimetableSchema);