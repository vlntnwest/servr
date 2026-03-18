const prisma = require("./prisma");

/**
 * Check if a restaurant is currently open, taking into account
 * exceptional hours (closures / custom hours) before regular hours.
 */
async function isRestaurantOpen(restaurantId, openingHours) {
  if (!openingHours || openingHours.length === 0) return true;

  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10); // YYYY-MM-DD

  // Check exceptional hours first
  const exceptional = await prisma.exceptionalHour.findUnique({
    where: { restaurantId_date: { restaurantId, date: new Date(todayStr) } },
  });

  if (exceptional) {
    if (exceptional.isClosed) return false;
    if (exceptional.openTime && exceptional.closeTime) {
      const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
      return currentTime >= exceptional.openTime && currentTime < exceptional.closeTime;
    }
  }

  // Fall back to regular opening hours
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayHours = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!todayHours) return false;
  return currentTime >= todayHours.openTime && currentTime < todayHours.closeTime;
}

module.exports = { isRestaurantOpen };
