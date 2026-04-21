const express = require("express");
const router = express.Router();
const promoCodeControllers = require("../controllers/promoCode.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isRestaurantAdmin } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { promoCodeSchema, validatePromoCodeSchema } = require("../validators/schemas");

// Public — validate a promo code before placing order
router.post(
  "/restaurants/:restaurantId/promo-codes/validate",
  validate({ body: validatePromoCodeSchema }),
  promoCodeControllers.validatePromoCode,
);

// Protected — ADMIN+ required
router.get(
  "/restaurants/:restaurantId/promo-codes",
  checkAuth,
  isRestaurantAdmin,
  promoCodeControllers.getPromoCodes,
);

router.post(
  "/restaurants/:restaurantId/promo-codes",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: promoCodeSchema }),
  promoCodeControllers.createPromoCode,
);

router.delete(
  "/restaurants/:restaurantId/promo-codes/:promoCodeId",
  checkAuth,
  isRestaurantAdmin,
  promoCodeControllers.deletePromoCode,
);

module.exports = router;
