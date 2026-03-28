const mongoose = require('mongoose');

const FacultySchema = new mongoose.Schema({
  name:       { type: String, required: true },
  department: { type: String, required: true },
  year:       { type: String, required: true },
  semester:   { type: String, required: true },
  subject:    { type: String, required: true },
  experience: { type: String, default: '' },
  rating:     { type: Number, min: 1, max: 5, default: null },
  email:      { type: String, default: '' }
}, { timestamps: true });

module.exports = mongoose.model('Faculty', FacultySchema);