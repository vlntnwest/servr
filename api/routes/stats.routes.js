const express = require("express");
const router = express.Router();
const statsControllers = require("../controllers/stats.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isRestaurantAdmin } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { z } = require("zod");

const statsQuerySchema = z.object({
  period: z.enum(["day", "week", "month"]).default("month"),
});

router.get(
  "/restaurants/:restaurantId/stats",
  checkAuth,
  isRestaurantAdmin,
  validate({ query: statsQuerySchema }),
  statsControllers.getStats,
);

module.exports = router;
