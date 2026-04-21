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

module.exports = { isRestaurantAdmin };
