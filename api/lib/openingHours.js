const prisma = require("./prisma");

function getTimeParts(date, timezone) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: timezone,
    weekday: "short",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);

  const map = {};
  for (const { type, value } of parts) map[type] = value;

  const WEEKDAY = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    todayStr: `${map.year}-${map.month}-${map.day}`,
    dayOfWeek: WEEKDAY[map.weekday],
    currentTime: `${map.hour}:${map.minute}`,
  };
}

/**
 * Check if a restaurant is currently open, taking into account
 * exceptional hours (closures / custom hours) before regular hours.
 */
async function isRestaurantOpen(restaurantId, openingHours, timezone = "Europe/Paris") {
  if (!openingHours || openingHours.length === 0) return true;

  const { todayStr, dayOfWeek, currentTime } = getTimeParts(new Date(), timezone);

  const exceptional = await prisma.exceptionalHour.findUnique({
    where: { restaurantId_date: { restaurantId, date: new Date(todayStr) } },
  });

  if (exceptional) {
    if (exceptional.isClosed) return false;
    if (exceptional.openTime && exceptional.closeTime) {
      return currentTime >= exceptional.openTime && currentTime < exceptional.closeTime;
    }
  }

  const todayRanges = openingHours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (todayRanges.length === 0) return false;
  return todayRanges.some((h) => currentTime >= h.openTime && currentTime < h.closeTime);
}

/**
 * Check if a scheduled time falls within any opening hour range for that day.
 */
function isScheduledTimeValid(openingHours, scheduledAt, timezone = "Europe/Paris") {
  const dt = new Date(scheduledAt);
  if (dt <= new Date()) return false;
  if (!openingHours || openingHours.length === 0) return true;

  const { dayOfWeek, currentTime: scheduledTime } = getTimeParts(dt, timezone);
  const dayRanges = openingHours.filter((h) => h.dayOfWeek === dayOfWeek);
  if (dayRanges.length === 0) return false;
  return dayRanges.some((h) => scheduledTime >= h.openTime && scheduledTime < h.closeTime);
}

module.exports = { isRestaurantOpen, isScheduledTimeValid };
