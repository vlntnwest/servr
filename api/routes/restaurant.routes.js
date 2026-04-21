const express = require("express");
const router = express.Router();
const restaurantControllers = require("../controllers/restaurant.controllers");
const stripeControllers = require("../controllers/stripe.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isRestaurantAdmin } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { restaurantSchema, updatePreparationLevelSchema } = require("../validators/schemas");

// Public — get restaurant by slug (must be before /:restaurantId)
router.get("/by-slug/:slug", restaurantControllers.getRestaurantBySlug);

// Public — get restaurant info
router.get("/:restaurantId", restaurantControllers.getRestaurant);

router.post(
  "/",
  checkAuth,
  validate({ body: restaurantSchema }),
  restaurantControllers.createRestaurant,
);
router.put(
  "/:restaurantId",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: restaurantSchema.partial() }),
  restaurantControllers.updateRestaurant,
);
router.delete(
  "/:restaurantId",
  checkAuth,
  isRestaurantAdmin,
  restaurantControllers.deleteRestaurant,
);

// Preparation level (STAFF+)
router.patch(
  "/:restaurantId/preparation-level",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: updatePreparationLevelSchema }),
  restaurantControllers.updatePreparationLevel,
);

// Stripe Connect
router.post(
  "/:restaurantId/stripe/onboard",
  checkAuth,
  isRestaurantAdmin,
  stripeControllers.initiateStripeOnboarding,
);
router.get(
  "/:restaurantId/stripe/status",
  checkAuth,
  isRestaurantAdmin,
  stripeControllers.getStripeStatus,
);

module.exports = router;
