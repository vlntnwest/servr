const logger = require("../logger");

const isRestaurantAdmin = (req, res, next) => {
  const user = req.user;
  const restaurantId = req.params.restaurantId;

  if (!user.restaurants.some((r) => r.id === restaurantId)) {
    logger.warn(
      { userId: user.id, restaurantId },
      "User is not admin of restaurant",
    );
    return res.status(403).json({ error: "Access denied" });
  }

  next();
};

// Platform-level admin: allow-list of Supabase user IDs in
// PLATFORM_ADMIN_USER_IDS (comma-separated). Empty/missing = no one allowed.
const isPlatformAdmin = (req, res, next) => {
  const allowList = (process.env.PLATFORM_ADMIN_USER_IDS || "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!req.user || !allowList.includes(req.user.id)) {
    logger.warn(
      { userId: req.user?.id, path: req.path },
      "Non-platform-admin attempted privileged action",
    );
    return res.status(403).json({ error: "Access denied" });
  }

  next();
};

module.exports = { isRestaurantAdmin, isPlatformAdmin };
