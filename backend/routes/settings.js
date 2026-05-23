const express = require("express");
const { getDb } = require("../db/init");
const { authenticate, requireAdmin } = require("../middleware/auth");

const router = express.Router();
router.use(authenticate);

router.get("/plant-info", (req, res, next) => {
  try { res.json(getDb().prepare("SELECT * FROM plant_info WHERE id=1").get() || {}); }
  catch(e) { next(e); }
});

router.put("/plant-info", requireAdmin, (req, res, next) => {
  try {
    const { package_name, benchmark, key_deliverable_no, grade, sla_description } = req.body;
    getDb().prepare("UPDATE plant_info SET package_name=?,benchmark=?,key_deliverable_no=?,grade=?,sla_description=? WHERE id=1")
      .run(package_name, parseFloat(benchmark) || 3.5, key_deliverable_no, grade, sla_description);
    res.json({ message: "Updated" });
  } catch(e) { next(e); }
});

module.exports = router;