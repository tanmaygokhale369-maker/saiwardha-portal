const express = require("express");
const { getDb } = require("../db/init");
const { authenticate, requireAdmin } = require("../middleware/auth");
const router = express.Router();
router.use(authenticate);

router.get("/", async (req, res, next) => {
  try {
    const db = getDb();
    const areas = await db.prepare("SELECT * FROM areas WHERE is_active=1 ORDER BY display_order").all();
    const subs = await db.prepare("SELECT * FROM sub_areas ORDER BY area_id, display_order").all();

    // Get fresh user data from DB to check assigned_areas
    const freshUser = await db.prepare("SELECT assigned_areas FROM users WHERE id=$1").get(req.user.id);
    const assignedAreas = freshUser?.assigned_areas;

    let filteredAreas = areas;
    if (!req.user.is_admin && assignedAreas) {
      const assignedIds = assignedAreas.split(",").filter(Boolean).map(Number);
      if (assignedIds.length > 0) {
        filteredAreas = areas.filter(a => assignedIds.includes(a.id));
      }
    }

    res.json(filteredAreas.map(a => ({ ...a, sub_areas: subs.filter(s => s.area_id === a.id) })));
  } catch(e) { next(e); }
});

router.put("/:id", requireAdmin, async (req, res, next) => {
  try {
    await getDb().prepare("UPDATE areas SET in_charge=$1 WHERE id=$2").run(req.body.in_charge||"", parseInt(req.params.id));
    res.json({ message: "Updated" });
  } catch(e) { next(e); }
});

module.exports = router;