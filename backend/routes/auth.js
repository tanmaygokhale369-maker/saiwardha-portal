const express = require("express");
const bcrypt = require("bcryptjs");
const { getDb } = require("../db/init");
const { generateToken, authenticate } = require("../middleware/auth");
const router = express.Router();

router.post("/login", async (req, res, next) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: "Username and password required" });
    const db = getDb();
    const user = await db.prepare(`
      SELECT u.*, r.can_rate, r.can_view_penalties, r.can_add_remarks,
             r.can_export, r.can_manage_users, r.can_manage_settings,
             r.is_admin, r.name as role_name
      FROM users u LEFT JOIN roles r ON u.role_id = r.id
      WHERE u.username = $1 AND u.is_active = 1
    `).get(username.toLowerCase().trim());
    if (!user || !bcrypt.compareSync(password, user.password_hash)) return res.status(401).json({ error: "Invalid credentials" });
    const token = generateToken(user);
    const { password_hash, ...safeUser } = user;
    res.json({ token, user: safeUser });
  } catch(e) { next(e); }
});

router.get("/me", authenticate, async (req, res) => {
  const { password_hash, ...safeUser } = req.user;
  res.json(safeUser);
});

router.post("/change-password", authenticate, async (req, res, next) => {
  try {
    const { current_password, new_password } = req.body;
    if (!current_password || !new_password) return res.status(400).json({ error: "Both required" });
    if (new_password.length < 6) return res.status(400).json({ error: "Min 6 chars" });
    const db = getDb();
    const user = await db.prepare("SELECT * FROM users WHERE id=$1").get(req.user.id);
    if (!bcrypt.compareSync(current_password, user.password_hash)) return res.status(401).json({ error: "Wrong password" });
    await db.prepare("UPDATE users SET password_hash=$1 WHERE id=$2").run(bcrypt.hashSync(new_password,10), req.user.id);
    res.json({ message: "Password changed" });
  } catch(e) { next(e); }
});

module.exports = router;