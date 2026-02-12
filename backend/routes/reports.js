const express = require("express");
const router = express.Router();

/*
  Week 1–4 Preview Route
  Reports logic will be fully implemented in later phases
*/

router.get("/", (req, res) => {
  res.json({
    message: "Reports module preview (Phase 2 feature)",
    monthlySummary: [],
    categoryBreakdown: [],
    budgetComparison: [],
  });
});

module.exports = router;
