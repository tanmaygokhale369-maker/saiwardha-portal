const express = require("express");
const { getDb } = require("../db/init");
const { authenticate, requireAdmin } = require("../middleware/auth");
const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try { res.json(await getDb().prepare("SELECT * FROM assessment_months ORDER BY month_date DESC").all()); }
  catch(e) { next(e); }
});

router.get("/current", async (req, res, next) => {
  try {
    const m = await getDb().prepare("SELECT * FROM assessment_months WHERE is_current=1").get();
    if (!m) return res.status(404).json({ error: "No current month" });
    res.json(m);
  } catch(e) { next(e); }
});

router.post("/", requireAdmin, async (req, res, next) => {
  try {
    const { month_label, month_date } = req.body;
    if (!month_label || !month_date) return res.status(400).json({ error: "Required fields missing" });
    const db = getDb();
    await db.prepare("UPDATE assessment_months SET is_current=0, is_locked=1 WHERE is_current=1").run();
    await db.prepare("INSERT INTO assessment_months (month_label,month_date,is_current,is_locked) VALUES ($1,$2,1,0)").run(month_label, month_date);
    res.json({ message: "New month created" });
  } catch(e) { next(e); }
});

router.put("/:id/unlock", requireAdmin, async (req, res, next) => {
  try { await getDb().prepare("UPDATE assessment_months SET is_locked=0 WHERE id=$1").run(parseInt(req.params.id)); res.json({ message: "Unlocked" }); }
  catch(e) { next(e); }
});

router.put("/:id/lock", requireAdmin, async (req, res, next) => {
  try { await getDb().prepare("UPDATE assessment_months SET is_locked=1 WHERE id=$1").run(parseInt(req.params.id)); res.json({ message: "Locked" }); }
  catch(e) { next(e); }
});

module.exports = router;