const express = require("express");
const { getDb } = require("../db/init");
const { authenticate, requirePermission } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/month/:monthId", (req, res, next) => {
  try { res.json(getDb().prepare("SELECT * FROM remarks WHERE month_id=?").all(parseInt(req.params.monthId))); }
  catch(e) { next(e); }
});

router.post("/", requirePermission("can_add_remarks"), (req, res, next) => {
  try {
    const { month_id, area_id, week_number, remark_type, remark_text } = req.body;
    if (!month_id || !area_id || !remark_type) return res.status(400).json({ error: "month_id, area_id, remark_type required" });
    if (!["oeg","general"].includes(remark_type)) return res.status(400).json({ error: "Invalid remark_type" });

    const db = getDb();
    const wn = week_number || null;
    const existing = wn
      ? db.prepare("SELECT id FROM remarks WHERE month_id=? AND area_id=? AND week_number=? AND remark_type=?").get(month_id, area_id, wn, remark_type)
      : db.prepare("SELECT id FROM remarks WHERE month_id=? AND area_id=? AND week_number IS NULL AND remark_type=?").get(month_id, area_id, remark_type);

    if (existing) {
      db.prepare("UPDATE remarks SET remark_text=?, created_by=? WHERE id=?").run(remark_text || "", req.user.id, existing.id);
    } else {
      db.prepare("INSERT INTO remarks (month_id,area_id,week_number,remark_type,remark_text,created_by) VALUES (?,?,?,?,?,?)").run(month_id, area_id, wn, remark_type, remark_text || "", req.user.id);
    }
    res.json({ message: "Remark saved" });
  } catch(e) { next(e); }
});

module.exports = router;