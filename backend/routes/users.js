const express = require("express");
const bcrypt = require("bcryptjs");
const { getDb } = require("../db/init");
const { authenticate, requireAdmin, requirePermission } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/roles", (req, res, next) => {
  try { res.json(getDb().prepare("SELECT * FROM roles ORDER BY name").all()); }
  catch(e) { next(e); }
});

router.post("/roles", requireAdmin, (req, res, next) => {
  try {
    const { name, can_rate=0, can_view_penalties=0, can_add_remarks=0, can_export=0, can_manage_users=0, can_manage_settings=0, is_admin=0 } = req.body;
    if (!name) return res.status(400).json({ error: "Role name required" });
    const db = getDb();
    if (db.prepare("SELECT id FROM roles WHERE name=?").get(name)) return res.status(400).json({ error: "Role already exists" });
    db.prepare("INSERT INTO roles (name,can_rate,can_view_penalties,can_add_remarks,can_export,can_manage_users,can_manage_settings,is_admin) VALUES (?,?,?,?,?,?,?,?)").run(name,can_rate?1:0,can_view_penalties?1:0,can_add_remarks?1:0,can_export?1:0,can_manage_users?1:0,can_manage_settings?1:0,is_admin?1:0);
    res.json({ message: "Role created" });
  } catch(e) { next(e); }
});

router.put("/roles/:id", requireAdmin, (req, res, next) => {
  try {
    const { name, can_rate=0, can_view_penalties=0, can_add_remarks=0, can_export=0, can_manage_users=0, can_manage_settings=0, is_admin=0 } = req.body;
    getDb().prepare("UPDATE roles SET name=?,can_rate=?,can_view_penalties=?,can_add_remarks=?,can_export=?,can_manage_users=?,can_manage_settings=?,is_admin=? WHERE id=?").run(name,can_rate?1:0,can_view_penalties?1:0,can_add_remarks?1:0,can_export?1:0,can_manage_users?1:0,can_manage_settings?1:0,is_admin?1:0,parseInt(req.params.id));
    res.json({ message: "Role updated" });
  } catch(e) { next(e); }
});

router.delete("/roles/:id", requireAdmin, (req, res, next) => {
  try {
    const db = getDb();
    const inUse = db.prepare("SELECT COUNT(*) as c FROM users WHERE role_id=?").get(parseInt(req.params.id));
    if (inUse && inUse.c > 0) return res.status(400).json({ error: "Role in use" });
    db.prepare("DELETE FROM roles WHERE id=?").run(parseInt(req.params.id));
    res.json({ message: "Deleted" });
  } catch(e) { next(e); }
});

router.get("/users", requirePermission("can_manage_users"), (req, res, next) => {
  try {
    res.json(getDb().prepare("SELECT u.id,u.username,u.full_name,u.is_active,u.created_at,r.name as role_name,r.id as role_id,r.is_admin FROM users u LEFT JOIN roles r ON u.role_id=r.id ORDER BY u.username").all());
  } catch(e) { next(e); }
});

router.post("/users", requirePermission("can_manage_users"), (req, res, next) => {
  try {
    const { username, password, full_name, role_id } = req.body;
    if (!username || !password || !role_id) return res.status(400).json({ error: "Username, password and role required" });
    if (password.length < 6) return res.status(400).json({ error: "Password min 6 chars" });
    const db = getDb();
    if (db.prepare("SELECT id FROM users WHERE username=?").get(username.toLowerCase().trim())) return res.status(400).json({ error: "Username exists" });
    db.prepare("INSERT INTO users (username,password_hash,full_name,role_id) VALUES (?,?,?,?)").run(username.toLowerCase().trim(), bcrypt.hashSync(password,10), full_name||"", parseInt(role_id));
    res.json({ message: "User created" });
  } catch(e) { next(e); }
});

router.put("/users/:id", requirePermission("can_manage_users"), (req, res, next) => {
  try {
    const { full_name, role_id, is_active, password } = req.body;
    const db = getDb();
    if (password && password.length >= 6) db.prepare("UPDATE users SET password_hash=? WHERE id=?").run(bcrypt.hashSync(password,10), parseInt(req.params.id));
    db.prepare("UPDATE users SET full_name=?,role_id=?,is_active=? WHERE id=?").run(full_name||"", parseInt(role_id), is_active?1:0, parseInt(req.params.id));
    res.json({ message: "Updated" });
  } catch(e) { next(e); }
});

router.delete("/users/:id", requireAdmin, (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
    getDb().prepare("UPDATE users SET is_active=0 WHERE id=?").run(parseInt(req.params.id));
    res.json({ message: "Deactivated" });
  } catch(e) { next(e); }
});

module.exports = router;