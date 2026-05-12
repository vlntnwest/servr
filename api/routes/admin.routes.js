const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/auth.middleware");
const { isPlatformAdmin } = require("../middleware/role.middleware");
const { cleanupDraftOrders } = require("../controllers/admin.controllers");

router.delete(
  "/cleanup/draft-orders",
  checkAuth,
  isPlatformAdmin,
  cleanupDraftOrders,
);

module.exports = router;
