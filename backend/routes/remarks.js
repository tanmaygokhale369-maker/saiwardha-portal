const express = require("express");
const { getDb } = require("../db/init");
const { authenticate, requirePermission } = require("../middleware/auth");
const router = express.Router();
router.use(authenticate);

router.get("/month/:monthId", async (req, res, next) => {
  try { res.json(await getDb().prepare("SELECT * FROM remarks WHERE month_id=$1").all(parseInt(req.params.monthId))); }
  catch(e) { next(e); }
});

router.post("/", requirePermission("can_add_remarks"), async (req, res, next) => {
  try {
    const { month_id, area_id, week_number, remark_type, remark_text } = req.body;
    if (!month_id || !area_id || !remark_type) return res.status(400).json({ error: "Required fields missing" });
    const db = getDb();
    const wn = week_number || null;
    const existing = wn
      ? await db.prepare("SELECT id FROM remarks WHERE month_id=$1 AND area_id=$2 AND week_number=$3 AND remark_type=$4").get(month_id, area_id, wn, remark_type)
      : await db.prepare("SELECT id FROM remarks WHERE month_id=$1 AND area_id=$2 AND week_number IS NULL AND remark_type=$3").get(month_id, area_id, remark_type);
    if (existing) {
      await db.prepare("UPDATE remarks SET remark_text=$1, created_by=$2 WHERE id=$3").run(remark_text||"", req.user.id, existing.id);
    } else {
      await db.prepare("INSERT INTO remarks (month_id,area_id,week_number,remark_type,remark_text,created_by) VALUES ($1,$2,$3,$4,$5,$6)").run(month_id, area_id, wn, remark_type, remark_text||"", req.user.id);
    }
    res.json({ message: "Remark saved" });
  } catch(e) { next(e); }
});

module.exports = router;