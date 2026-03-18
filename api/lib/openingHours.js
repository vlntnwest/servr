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

  // Fall back to regular opening hours (multiple ranges per day)
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayRanges = openingHours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (todayRanges.length === 0) return false;
  return todayRanges.some((h) => currentTime >= h.openTime && currentTime < h.closeTime);
}

/**
 * Check if a scheduled time falls within any opening hour range for that day.
 */
function isScheduledTimeValid(openingHours, scheduledAt) {
  const dt = new Date(scheduledAt);
  if (dt <= new Date()) return false;
  if (!openingHours || openingHours.length === 0) return true;
  const dayOfWeek = dt.getDay();
  const hours = `${String(dt.getHours()).padStart(2, "0")}:${String(dt.getMinutes()).padStart(2, "0")}`;
  const dayRanges = openingHours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (dayRanges.length === 0) return false;
  return dayRanges.some((h) => hours >= h.openTime && hours < h.closeTime);
}

module.exports = { isRestaurantOpen, isScheduledTimeValid };
