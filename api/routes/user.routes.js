const express = require("express");
const router = express.Router();
const userControllers = require("../controllers/user.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { validate } = require("../middleware/validate.middleware");
const { updateUserSchema, getUserOrdersQuerySchema } = require("../validators/schemas");

router.get("/me/orders", checkAuth, validate({ query: getUserOrdersQuerySchema }), userControllers.getUserOrders);
router.get("/me", checkAuth, userControllers.getUserData);
router.put(
  "/me",
  checkAuth,
  validate({ body: updateUserSchema }),
  userControllers.updateUserData,
);
router.delete("/me", checkAuth, userControllers.deleteUser);

module.exports = router;
