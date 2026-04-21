const express = require("express");
const router = express.Router();
const orderControllers = require("../controllers/order.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isRestaurantAdmin } = require("../middleware/role.middleware");
const { validate } = require("../middleware/validate.middleware");
const {
  orderSchema,
  updateOrderStatusSchema,
} = require("../validators/schemas");

// Public — no auth required
router.get("/orders/:orderId", orderControllers.getOrderPublic);

// Public — create order (no auth required)
router.post(
  "/restaurants/:restaurantId/orders",
  validate({ body: orderSchema }),
  orderControllers.createOrder,
);

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
