const express = require("express");
const router = express.Router();
const statsControllers = require("../controllers/stats.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isAdmin } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { z } = require("zod");

const statsQuerySchema = z.object({
  period: z.enum(["day", "week", "month"]).default("month"),
});

router.get(
  "/restaurants/:restaurantId/stats",
  checkAuth,
  isAdmin,
  validate({ query: statsQuerySchema }),
  statsControllers.getStats,
);

module.exports = router;
