const express = require("express");
const router = express.Router();
const checkAuth = require("../middleware/auth.middleware");
const { cleanupDraftOrders } = require("../controllers/admin.controllers");

router.delete("/cleanup/draft-orders", checkAuth, cleanupDraftOrders);

module.exports = router;
