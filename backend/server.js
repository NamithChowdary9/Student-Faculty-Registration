const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../frontend')));

// Serve login page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, '../frontend/login.html'));
});

// Routes
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/faculty',   require('./routes/faculty'));
app.use('/api/selection', require('./routes/selection'));

// Connect DB and start server
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB Connected Successfully');

    // 🔥 IMPORTANT CHANGE HERE
    app.listen(process.env.PORT, '0.0.0.0', () => {
    console.log(`✅ Server running at http://localhost:${process.env.PORT}`);
});
  })
  .catch(err => {
    console.log('❌ MongoDB Connection Error:', err.message);
  });