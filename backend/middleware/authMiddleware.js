const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET || "facultysync_secret_2025";

function auth(req, res, next) {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ message: "No token provided" });
  try {
    req.user = jwt.verify(token, SECRET);
    next();
  } catch {
    return res.status(401).json({ message: "Invalid or expired token" });
  }
}

function adminOnly(req, res, next) {
  if (req.user?.role !== "admin")
    return res.status(403).json({ message: "Admin access required" });
  next();
}

function studentOnly(req, res, next) {
  if (req.user?.role !== "student")
    return res.status(403).json({ message: "Student access required" });
  next();
}

module.exports = { auth, adminOnly, studentOnly };