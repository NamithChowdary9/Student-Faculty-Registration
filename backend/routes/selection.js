const express   = require('express');
const router    = express.Router();
const Selection = require('../models/Selection');
const auth      = require('../middleware/authMiddleware');

// SAVE selection
router.post('/', auth, async (req, res) => {
  try {
    const { studentId, department, year, semester, selections } = req.body;
    const saved = await Selection.findOneAndUpdate(
      { studentId, department, year, semester },
      { selections },
      { upsert: true, new: true }
    );
    res.json({ message: 'Selection saved successfully', saved });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET selection
router.get('/:studentId', auth, async (req, res) => {
  try {
    const data = await Selection.findOne({
      studentId: req.params.studentId
    });
    res.json(data || {});
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;