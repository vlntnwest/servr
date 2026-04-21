const express = require("express");
const router = express.Router();
const multer = require("multer");
const uploadControllers = require("../controllers/upload.controllers");
const checkAuth = require("../middleware/auth.middleware");
const { isRestaurantAdmin } = require("../middleware/role.middleware");

// Store file in memory (passed as buffer to Supabase)
const upload = multer({ storage: multer.memoryStorage() });

// Upload image for a restaurant (ADMIN+)
router.post(
  "/restaurants/:restaurantId/upload",
  checkAuth,
  isRestaurantAdmin,
  upload.single("image"),
  uploadControllers.uploadImage,
);

// Delete image for a restaurant (ADMIN+)
router.delete(
  "/restaurants/:restaurantId/upload",
  checkAuth,
  isRestaurantAdmin,
  uploadControllers.deleteImage,
);

module.exports = router;
