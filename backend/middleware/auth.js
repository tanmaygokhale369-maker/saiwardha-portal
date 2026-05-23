const jwt = require("jsonwebtoken");
const { getDb } = require("../db/init");

const JWT_SECRET = process.env.JWT_SECRET || "saiwardha_secret_change_in_production";

function generateToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role_id: user.role_id },
    JWT_SECRET,
    { expiresIn: "24h" }
  );
}

function authenticate(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  try {
    const token = header.slice(7);
    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDb();
    const user = db.prepare(`
      SELECT u.id, u.username, u.full_name, u.role_id, u.is_active,
             r.can_rate, r.can_view_penalties, r.can_add_remarks,
             r.can_export, r.can_manage_users, r.can_manage_settings,
             r.is_admin, r.name as role_name
      FROM users u
      LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.id = ? AND u.is_active = 1
    `).get(decoded.id);
    if (!user) return res.status(401).json({ error: "User not found or inactive" });
    req.user = user;
    next();
  } catch (e) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || !req.user.is_admin) return res.status(403).json({ error: "Admin access required" });
  next();
}

function requirePermission(perm) {
  return (req, res, next) => {
    if (req.user && (req.user.is_admin || req.user[perm])) return next();
    return res.status(403).json({ error: `Permission required: ${perm}` });
  };
}

module.exports = { authenticate, requireAdmin, requirePermission, generateToken, JWT_SECRET };