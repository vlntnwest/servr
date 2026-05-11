const express = require("express");
const router = express.Router();
const orderControllers = require("../controllers/order.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isRestaurantAdmin } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const { updateOrderStatusSchema } = require("../validators/schemas");

// Public — no auth required (used by confirmation pages; UUID is unguessable)
router.get("/orders/:orderId", orderControllers.getOrderPublic);

// NOTE: the legacy `POST /restaurants/:restaurantId/orders` route was removed.
// Customers must go through `POST /checkout/create-session` so the order is
// either tied to a Stripe payment or explicitly marked PENDING_ON_SITE_PAYMENT.
// The controller (`order.controllers.createOrder`) is kept for unit tests only.

// Protected — STAFF+ required
router.get(
  "/restaurants/:restaurantId/orders",
  checkAuth,
  isRestaurantAdmin,
  orderControllers.getOrders,
);

router.get(
  "/restaurants/:restaurantId/orders/:orderId",
  checkAuth,
  isRestaurantAdmin,
  orderControllers.getOrder,
);

router.patch(
  "/restaurants/:restaurantId/orders/:orderId/status",
  checkAuth,
  isRestaurantAdmin,
  validate({ body: updateOrderStatusSchema }),
  orderControllers.updateOrderStatus,
);

module.exports = router;
