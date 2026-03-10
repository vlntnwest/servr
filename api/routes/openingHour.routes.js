const express = require("express");
const router = express.Router();
const openingHourControllers = require("../controllers/openingHour.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isAdmin } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { openingHoursSchema } = require("../validators/schemas");

// Public — list opening hours
router.get(
  "/restaurants/:restaurantId/opening-hours",
  openingHourControllers.getOpeningHours,
);

// Protected — ADMIN+ required, replaces all opening hours
router.put(
  "/restaurants/:restaurantId/opening-hours",
  checkAuth,
  isAdmin,
  validate({ body: openingHoursSchema }),
  openingHourControllers.updateOpeningHours,
);

module.exports = router;
