const express = require("express");
const router = express.Router();
const checkoutControllers = require("../controllers/checkout.controllers");
const { validate } = require("../middleware/validate.middleware");
const { checkoutSessionSchema } = require("../validators/schemas");
const checkAuth = require("../middleware/auth.middleware");
const { isRestaurantAdmin } = require("../middleware/role.middleware");

router.post(
  "/create-session",
  validate({ body: checkoutSessionSchema }),
  checkoutControllers.createCheckoutSession,
);

// express.raw() is applied in app.js before JSON parsing for this route
router.post("/webhook", checkoutControllers.handleWebhook);

// Refund an order (ADMIN+ required)
router.post(
  "/restaurants/:restaurantId/orders/:orderId/refund",
  checkAuth,
  isRestaurantAdmin,
  checkoutControllers.refundOrder,
);

module.exports = router;
