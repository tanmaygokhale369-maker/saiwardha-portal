const express = require("express");
const { getDb } = require("../db/init");
const { authenticate, requirePermission } = require("../middleware/auth");
const router = express.Router();
router.use(authenticate);

router.get("/month/:monthId/summary", async (req, res, next) => {
  try {
    const db = getDb();
    const monthId = parseInt(req.params.monthId);
    const plantInfo = await db.prepare("SELECT * FROM plant_info WHERE id=1").get() || {};
    const benchmark = plantInfo.benchmark || 3.5;
    const areas = await db.prepare("SELECT * FROM areas WHERE is_active=1 ORDER BY display_order").all();
    const allSubs = await db.prepare("SELECT * FROM sub_areas ORDER BY area_id, display_order").all();
    const ratings = await db.prepare("SELECT * FROM ratings WHERE month_id=$1").all(monthId);
    const remarks = await db.prepare("SELECT * FROM remarks WHERE month_id=$1").all(monthId);

    const ratingMap = {};
    const ratingLockedMap = {};
    ratings.forEach(r => {
      const key = `${r.area_id}_${r.sub_area_id || 0}_${r.week_number}`;
      ratingMap[key] = r.grade;
      ratingLockedMap[key] = r.grade !== null && r.grade !== undefined;
    });

    const summary = areas.map(a => {
      const areaSubs = allSubs.filter(s => s.area_id === a.id);
      const rows = areaSubs.length > 0 ? areaSubs : [{ id: 0, name: "Overall" }];
      const weekData = [1,2,3,4].map(w => {
        const grades = rows.map(sub => ratingMap[`${a.id}_${sub.id}_${w}`]).filter(v => v !== undefined && v !== null);
        const avg = grades.length ? grades.reduce((s,n)=>s+n,0)/grades.length : null;
        return {
          week: w,
          grades: rows.map(sub => ({ sub_id: sub.id, sub_name: sub.name, grade: ratingMap[`${a.id}_${sub.id}_${w}`]??null, is_locked: !!ratingLockedMap[`${a.id}_${sub.id}_${w}`] })),
          avg
        };
      });
      const weekAvgs = weekData.map(w=>w.avg).filter(v=>v!==null);
      const monthlyAvg = weekAvgs.length ? weekAvgs.reduce((s,n)=>s+n,0)/weekAvgs.length : null;
      const penalty = (monthlyAvg !== null && monthlyAvg < benchmark) ? (benchmark - monthlyAvg)*10*1000 : 0;
      return { area_id:a.id, area_number:a.area_number, area_name:a.area_name, in_charge:a.in_charge||"", sub_areas:rows, week_data:weekData, monthly_avg:monthlyAvg, penalty, benchmark, remarks:remarks.filter(r=>r.area_id===a.id) };
    });

    const allAvgs = summary.map(s=>s.monthly_avg).filter(v=>v!==null);
    const grandAvg = allAvgs.length ? allAvgs.reduce((s,n)=>s+n,0)/allAvgs.length : null;
    const totalPenalty = summary.reduce((s,a)=>s+a.penalty,0);
    res.json({ summary, grand_avg:grandAvg, total_penalty:totalPenalty, benchmark });
  } catch(e) { next(e); }
});

router.get("/month/:monthId", async (req, res, next) => {
  try { res.json(await getDb().prepare("SELECT * FROM ratings WHERE month_id=$1").all(parseInt(req.params.monthId))); }
  catch(e) { next(e); }
});

router.post("/bulk", requirePermission("can_rate"), async (req, res, next) => {
  try {
    const { month_id, ratings } = req.body;
    if (!month_id || !Array.isArray(ratings)) return res.status(400).json({ error: "Required fields missing" });
    const db = getDb();
    const month = await db.prepare("SELECT * FROM assessment_months WHERE id=$1").get(parseInt(month_id));
    if (!month) return res.status(404).json({ error: "Month not found" });
    if (month.is_locked && !req.user.is_admin) return res.status(403).json({ error: "Month is locked" });

    // Validate grades max 5
    for (const r of ratings) {
      if (r.grade !== null && r.grade !== undefined) {
        if (r.grade > 5) return res.status(400).json({ error: `Grade cannot exceed 5` });
        if (r.grade < 0) return res.status(400).json({ error: `Grade cannot be negative` });
      }
      // Check rater is only saving their assigned areas
      if (!req.user.is_admin && req.user.assigned_areas) {
        const assignedIds = req.user.assigned_areas.split(",").filter(Boolean).map(Number);
        if (assignedIds.length > 0 && !assignedIds.includes(r.area_id)) {
          return res.status(403).json({ error: `Not authorized to rate area ${r.area_id}` });
        }
      }
    }

    const skipped = [];
    for (const r of ratings) {
      if (r.grade === null || r.grade === undefined) continue;
      const subId = r.sub_area_id || null;
      const existing = subId
        ? await db.prepare("SELECT id, grade FROM ratings WHERE month_id=$1 AND area_id=$2 AND sub_area_id=$3 AND week_number=$4").get(month_id, r.area_id, subId, r.week_number)
        : await db.prepare("SELECT id, grade FROM ratings WHERE month_id=$1 AND area_id=$2 AND sub_area_id IS NULL AND week_number=$3").get(month_id, r.area_id, r.week_number);

      if (existing) {
        if (existing.grade !== null && !req.user.is_admin) { skipped.push(r); continue; }
        await db.prepare("UPDATE ratings SET grade=$1, rated_by=$2 WHERE id=$3").run(r.grade, req.user.id, existing.id);
      } else {
        await db.prepare("INSERT INTO ratings (month_id,area_id,sub_area_id,week_number,grade,rated_by) VALUES ($1,$2,$3,$4,$5,$6)").run(month_id, r.area_id, subId, r.week_number, r.grade, req.user.id);
      }
    }

    res.json({ message: "Ratings saved", skipped: skipped.length > 0 ? skipped : undefined });
  } catch(e) { next(e); }
});

module.exports = router;