const express = require("express");
const { getDb } = require("../db/init");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/", (req, res, next) => {
  try {
    const db = getDb();
    const areas = db.prepare("SELECT * FROM areas WHERE is_active=1 ORDER BY display_order").all();
    const subs = db.prepare("SELECT * FROM sub_areas ORDER BY area_id, display_order").all();
    res.json(areas.map(a => ({ ...a, sub_areas: subs.filter(s => s.area_id === a.id) })));
  } catch(e) { next(e); }
});

router.put("/:id", requireAdmin, (req, res, next) => {
  try {
    getDb().prepare("UPDATE areas SET in_charge=? WHERE id=?").run(req.body.in_charge || "", parseInt(req.params.id));
    res.json({ message: "Updated" });
  } catch(e) { next(e); }
});

module.exports = router;