const express = require("express");
const router = express.Router();
const multer = require("multer");
const uploadControllers = require("../controllers/upload.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isAdmin } = require("../middleware/role.middleware");

// Store file in memory (passed as buffer to Supabase)
const upload = multer({ storage: multer.memoryStorage() });

// Upload image for a restaurant (ADMIN+)
router.post(
  "/restaurants/:restaurantId/upload",
  checkAuth,
  isAdmin,
  upload.single("image"),
  uploadControllers.uploadImage,
);

module.exports = router;
