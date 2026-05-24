const express = require("express");
const { getDb } = require("../db/init");
const { authenticate, requireAdmin } = require("../middleware/auth");
const router = express.Router();
router.use(authenticate);

router.get("/plant-info", async (req, res, next) => {
  try { res.json(await getDb().prepare("SELECT * FROM plant_info WHERE id=1").get() || {}); }
  catch(e) { next(e); }
});

router.put("/plant-info", requireAdmin, async (req, res, next) => {
  try {
    const { package_name, benchmark, key_deliverable_no, grade, sla_description } = req.body;
    await getDb().prepare("UPDATE plant_info SET package_name=$1,benchmark=$2,key_deliverable_no=$3,grade=$4,sla_description=$5 WHERE id=1")
      .run(package_name, parseFloat(benchmark)||3.5, key_deliverable_no, grade, sla_description);
    res.json({ message: "Updated" });
  } catch(e) { next(e); }
});

module.exports = router;