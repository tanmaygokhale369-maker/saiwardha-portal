const express = require("express");
const { getDb } = require("../db/init");
const { authenticate, requirePermission } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/month/:monthId/summary", (req, res, next) => {
  try {
    const db = getDb();
    const monthId = parseInt(req.params.monthId);
    const plantInfo = db.prepare("SELECT * FROM plant_info WHERE id=1").get() || {};
    const benchmark = plantInfo.benchmark || 3.5;
    const areas = db.prepare("SELECT * FROM areas WHERE is_active=1 ORDER BY display_order").all();
    const allSubs = db.prepare("SELECT * FROM sub_areas ORDER BY area_id, display_order").all();
    const ratings = db.prepare("SELECT * FROM ratings WHERE month_id=?").all(monthId);
    const remarks = db.prepare("SELECT * FROM remarks WHERE month_id=?").all(monthId);

    const ratingMap = {};
    const ratingLockedMap = {}; // track which ratings are already saved (locked)
    ratings.forEach(r => {
      const key = `${r.area_id}_${r.sub_area_id || 0}_${r.week_number}`;
      ratingMap[key] = r.grade;
      ratingLockedMap[key] = r.grade !== null && r.grade !== undefined; // locked if grade was saved
    });

    const summary = areas.map(a => {
      const areaSubs = allSubs.filter(s => s.area_id === a.id);
      const rows = areaSubs.length > 0 ? areaSubs : [{ id: 0, name: "Overall" }];

      const weekData = [1,2,3,4].map(w => {
        const grades = rows.map(sub => ratingMap[`${a.id}_${sub.id}_${w}`]).filter(v => v !== undefined && v !== null);
        const avg = grades.length ? grades.reduce((s,n) => s+n, 0) / grades.length : null;
        return {
          week: w,
          grades: rows.map(sub => ({
            sub_id: sub.id, sub_name: sub.name,
            grade: ratingMap[`${a.id}_${sub.id}_${w}`] ?? null,
            is_locked: !!ratingLockedMap[`${a.id}_${sub.id}_${w}`]
          })),
          avg
        };
      });

      const weekAvgs = weekData.map(w => w.avg).filter(v => v !== null);
      const monthlyAvg = weekAvgs.length ? weekAvgs.reduce((s,n) => s+n, 0) / weekAvgs.length : null;
      const penalty = (monthlyAvg !== null && monthlyAvg < benchmark) ? (benchmark - monthlyAvg) * 10 * 1000 : 0;

      return {
        area_id: a.id, area_number: a.area_number, area_name: a.area_name,
        in_charge: a.in_charge || "", sub_areas: rows,
        week_data: weekData, monthly_avg: monthlyAvg, penalty, benchmark,
        remarks: remarks.filter(r => r.area_id === a.id)
      };
    });

    const allAvgs = summary.map(s => s.monthly_avg).filter(v => v !== null);
    const grandAvg = allAvgs.length ? allAvgs.reduce((s,n) => s+n, 0) / allAvgs.length : null;
    const totalPenalty = summary.reduce((s, a) => s + a.penalty, 0);
    res.json({ summary, grand_avg: grandAvg, total_penalty: totalPenalty, benchmark });
  } catch(e) { next(e); }
});

router.get("/month/:monthId", (req, res, next) => {
  try {
    res.json(getDb().prepare("SELECT * FROM ratings WHERE month_id=?").all(parseInt(req.params.monthId)));
  } catch(e) { next(e); }
});

router.post("/bulk", requirePermission("can_rate"), (req, res, next) => {
  try {
    const { month_id, ratings } = req.body;
    if (!month_id || !Array.isArray(ratings)) return res.status(400).json({ error: "month_id and ratings array required" });

    const db = getDb();
    const month = db.prepare("SELECT * FROM assessment_months WHERE id=?").get(parseInt(month_id));
    if (!month) return res.status(404).json({ error: "Month not found" });
    if (month.is_locked && !req.user.is_admin) return res.status(403).json({ error: "Month is locked" });

    // Validate grades: max 5, min 0
    for (const r of ratings) {
      if (r.grade !== null && r.grade !== undefined) {
        if (r.grade > 5) return res.status(400).json({ error: `Grade cannot exceed 5 (got ${r.grade})` });
        if (r.grade < 0) return res.status(400).json({ error: `Grade cannot be negative (got ${r.grade})` });
      }
    }

    const skipped = [];
    db.transaction((items) => {
      items.forEach(r => {
        if (r.grade === null || r.grade === undefined) return; // skip empty
        const subId = r.sub_area_id || null;
        const existing = subId
          ? db.prepare("SELECT id, grade FROM ratings WHERE month_id=? AND area_id=? AND sub_area_id=? AND week_number=?").get(month_id, r.area_id, subId, r.week_number)
          : db.prepare("SELECT id, grade FROM ratings WHERE month_id=? AND area_id=? AND sub_area_id IS NULL AND week_number=?").get(month_id, r.area_id, r.week_number);

        if (existing) {
          // If rating already saved and user is NOT admin → block edit
          if (existing.grade !== null && !req.user.is_admin) {
            skipped.push(`area_id:${r.area_id} week:${r.week_number}`);
            return; // skip - locked
          }
          // Admin can always update
          db.prepare("UPDATE ratings SET grade=?, rated_by=? WHERE id=?").run(r.grade, req.user.id, existing.id);
        } else {
          db.prepare("INSERT INTO ratings (month_id,area_id,sub_area_id,week_number,grade,rated_by) VALUES (?,?,?,?,?,?)").run(
            month_id, r.area_id, subId, r.week_number, r.grade, req.user.id
          );
        }
      });
    })(ratings);

    if (skipped.length > 0 && !req.user.is_admin) {
      res.json({ message: `Ratings saved. ${skipped.length} already-submitted grade(s) were not changed (admin required to edit).`, skipped });
    } else {
      res.json({ message: `Ratings saved successfully.` });
    }
  } catch(e) { next(e); }
});

module.exports = router;