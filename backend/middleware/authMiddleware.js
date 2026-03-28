const jwt = require('jsonwebtoken');

module.exports = function(req, res, next) {

  let token = req.header('Authorization');

  if (!token) {
    return res.status(401).json({ message: 'Access denied. No token.' });
  }

  // Works with both "Bearer eyJ..." and raw "eyJ..."
  if (token.startsWith('Bearer ')) {
    token = token.slice(7).trim();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Invalid token.' });
  }
};