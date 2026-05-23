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
    ratings.forEach(r => {
      ratingMap[`${r.area_id}_${r.sub_area_id || 0}_${r.week_number}`] = r.grade;
    });

    const summary = areas.map(a => {
      const areaSubs = allSubs.filter(s => s.area_id === a.id);
      const rows = areaSubs.length > 0 ? areaSubs : [{ id: 0, name: "Overall" }];

      const weekData = [1,2,3,4].map(w => {
        const grades = rows
          .map(sub => ratingMap[`${a.id}_${sub.id}_${w}`])
          .filter(v => v !== undefined && v !== null);
        const avg = grades.length ? grades.reduce((s,n) => s+n, 0) / grades.length : null;
        return {
          week: w,
          grades: rows.map(sub => ({ sub_id: sub.id, sub_name: sub.name, grade: ratingMap[`${a.id}_${sub.id}_${w}`] ?? null })),
          avg
        };
      });

      const weekAvgs = weekData.map(w => w.avg).filter(v => v !== null);
      const monthlyAvg = weekAvgs.length ? weekAvgs.reduce((s,n) => s+n, 0) / weekAvgs.length : null;
      const subCount = areaSubs.length > 0 ? areaSubs.length : 1;
      const penalty = (monthlyAvg !== null && monthlyAvg < benchmark) ? (benchmark - monthlyAvg) * 10000 * subCount : 0;

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
    const ratings = getDb().prepare("SELECT * FROM ratings WHERE month_id=?").all(parseInt(req.params.monthId));
    res.json(ratings);
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

    db.transaction((items) => {
      items.forEach(r => {
        const subId = r.sub_area_id || null;
        // Check if exists
        const existing = subId
          ? db.prepare("SELECT id FROM ratings WHERE month_id=? AND area_id=? AND sub_area_id=? AND week_number=?").get(month_id, r.area_id, subId, r.week_number)
          : db.prepare("SELECT id FROM ratings WHERE month_id=? AND area_id=? AND sub_area_id IS NULL AND week_number=?").get(month_id, r.area_id, r.week_number);

        if (existing) {
          db.prepare("UPDATE ratings SET grade=?, rated_by=? WHERE id=?").run(r.grade ?? null, req.user.id, existing.id);
        } else {
          db.prepare("INSERT INTO ratings (month_id,area_id,sub_area_id,week_number,grade,rated_by) VALUES (?,?,?,?,?,?)").run(
            month_id, r.area_id, subId, r.week_number, r.grade ?? null, req.user.id
          );
        }
      });
    })(ratings);

    res.json({ message: `${ratings.length} ratings saved` });
  } catch(e) { next(e); }
});

module.exports = router;