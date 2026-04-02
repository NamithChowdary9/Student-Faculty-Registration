const mongoose = require("mongoose");

/* ── CLASSROOM ── */
const roomSchema = new mongoose.Schema(
  {
    roomNumber: { type: String, required: true, unique: true },
    capacity: { type: Number, default: 60 },
    block: { type: String, default: "A" },
    floor: { type: Number, default: 1 },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

/* ── TIMETABLE SLOT ── */
const timetableSlotSchema = new mongoose.Schema(
  {
    department: { type: String, required: true },
    year: { type: Number, required: true },      // Changed to Number
    semester: { type: Number, required: true },  // Changed to Number
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
    facultyName: String,
    subject: String,
    day: String,
    periodNumber: Number,
    startTime: String,
    endTime: String,
    roomNumber: String,
    studentIds: [String],
    studentCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

/* ── ROOM ALLOCATION SUMMARY ── */
const roomAllocationSchema = new mongoose.Schema(
  {
    department: String,
    year: Number,     // Changed to Number
    semester: Number, // Changed to Number
    subject: String,
    facultyId: { type: mongoose.Schema.Types.ObjectId, ref: "Faculty" },
    facultyName: String,
    roomNumber: String,
    day: String,
    period: Number,
    studentCount: Number,
    allocatedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const Room = mongoose.model("Room", roomSchema);
const TimetableSlot = mongoose.model("TimetableSlot", timetableSlotSchema);
const RoomAllocation = mongoose.model("RoomAllocation", roomAllocationSchema);

module.exports = { Room, TimetableSlot, RoomAllocation };