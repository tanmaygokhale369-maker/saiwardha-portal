const express = require("express");
const bcrypt = require("bcryptjs");
const { getDb } = require("../db/init");
const { authenticate, requireAdmin, requirePermission } = require("../middleware/auth");
const router = express.Router();
router.use(authenticate);

router.get("/roles", async (req, res, next) => {
  try { res.json(await getDb().prepare("SELECT * FROM roles ORDER BY name").all()); }
  catch(e) { next(e); }
});

router.post("/roles", requireAdmin, async (req, res, next) => {
  try {
    const { name, can_rate=0, can_view_penalties=0, can_add_remarks=0, can_export=0, can_manage_users=0, can_manage_settings=0, is_admin=0 } = req.body;
    if (!name) return res.status(400).json({ error: "Role name required" });
    await getDb().prepare("INSERT INTO roles (name,can_rate,can_view_penalties,can_add_remarks,can_export,can_manage_users,can_manage_settings,is_admin) VALUES ($1,$2,$3,$4,$5,$6,$7,$8)")
      .run(name,can_rate?1:0,can_view_penalties?1:0,can_add_remarks?1:0,can_export?1:0,can_manage_users?1:0,can_manage_settings?1:0,is_admin?1:0);
    res.json({ message: "Role created" });
  } catch(e) { next(e); }
});

router.put("/roles/:id", requireAdmin, async (req, res, next) => {
  try {
    const { name, can_rate=0, can_view_penalties=0, can_add_remarks=0, can_export=0, can_manage_users=0, can_manage_settings=0, is_admin=0 } = req.body;
    await getDb().prepare("UPDATE roles SET name=$1,can_rate=$2,can_view_penalties=$3,can_add_remarks=$4,can_export=$5,can_manage_users=$6,can_manage_settings=$7,is_admin=$8 WHERE id=$9")
      .run(name,can_rate?1:0,can_view_penalties?1:0,can_add_remarks?1:0,can_export?1:0,can_manage_users?1:0,can_manage_settings?1:0,is_admin?1:0,parseInt(req.params.id));
    res.json({ message: "Updated" });
  } catch(e) { next(e); }
});

router.delete("/roles/:id", requireAdmin, async (req, res, next) => {
  try {
    const inUse = await getDb().prepare("SELECT COUNT(*) as c FROM users WHERE role_id=$1").get(parseInt(req.params.id));
    if (parseInt(inUse?.c) > 0) return res.status(400).json({ error: "Role in use" });
    await getDb().prepare("DELETE FROM roles WHERE id=$1").run(parseInt(req.params.id));
    res.json({ message: "Deleted" });
  } catch(e) { next(e); }
});

router.get("/users", requirePermission("can_manage_users"), async (req, res, next) => {
  try {
    res.json(await getDb().prepare("SELECT u.id,u.username,u.full_name,u.is_active,u.created_at,u.assigned_area_id,r.name as role_name,r.id as role_id,r.is_admin FROM users u LEFT JOIN roles r ON u.role_id=r.id ORDER BY u.username").all());
  } catch(e) { next(e); }
});

router.post("/users", requirePermission("can_manage_users"), async (req, res, next) => {
  try {
    const { username, password, full_name, role_id, assigned_area_id } = req.body;
    if (!username || !password || !role_id) return res.status(400).json({ error: "Username, password and role required" });
    if (password.length < 6) return res.status(400).json({ error: "Password min 6 chars" });
    await getDb().prepare("INSERT INTO users (username,password_hash,full_name,role_id,assigned_area_id) VALUES ($1,$2,$3,$4,$5)")
      .run(username.toLowerCase().trim(), bcrypt.hashSync(password,10), full_name||"", parseInt(role_id), assigned_area_id||null);
    res.json({ message: "User created" });
  } catch(e) {
    if (e.code === "23505") return res.status(400).json({ error: "Username exists" });
    next(e);
  }
});

router.put("/users/:id", requirePermission("can_manage_users"), async (req, res, next) => {
  try {
    const { full_name, role_id, is_active, password, assigned_area_id } = req.body;
    const db = getDb();
    if (password && password.length >= 6) await db.prepare("UPDATE users SET password_hash=$1 WHERE id=$2").run(bcrypt.hashSync(password,10), parseInt(req.params.id));
    await db.prepare("UPDATE users SET full_name=$1,role_id=$2,is_active=$3,assigned_area_id=$4 WHERE id=$5").run(full_name||"", parseInt(role_id), is_active?1:0, assigned_area_id||null, parseInt(req.params.id));
    res.json({ message: "Updated" });
  } catch(e) { next(e); }
});

router.delete("/users/:id", requireAdmin, async (req, res, next) => {
  try {
    if (parseInt(req.params.id) === req.user.id) return res.status(400).json({ error: "Cannot delete yourself" });
    await getDb().prepare("UPDATE users SET is_active=0 WHERE id=$1").run(parseInt(req.params.id));
    res.json({ message: "Deactivated" });
  } catch(e) { next(e); }
});

module.exports = router;