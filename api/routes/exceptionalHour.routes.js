const express = require("express");
const router = express.Router();
const exceptionalHourControllers = require("../controllers/exceptionalHour.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isRestaurantAdmin } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { exceptionalHourSchema } = require("../validators/schemas");

router.get(
  "/restaurants/:restaurantId/exceptional-hours",
  exceptionalHourControllers.getExceptionalHours,
);

router.post(
  "/restaurants/:restaurantId/exceptional-hours",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: exceptionalHourSchema }),
  exceptionalHourControllers.createExceptionalHour,
);

router.delete(
  "/restaurants/:restaurantId/exceptional-hours/:exceptionalHourId",
  checkAuth,
  isRestaurantAdmin,
  exceptionalHourControllers.deleteExceptionalHour,
);

module.exports = router;
