const { isScheduledTimeValid } = require("../../controllers/order.controllers");

// Opening hours fixture: open Mon–Fri 12:00–22:00 (dayOfWeek 1–5)
const weekdayHours = [
  { dayOfWeek: 1, openTime: "12:00", closeTime: "22:00" },
  { dayOfWeek: 2, openTime: "12:00", closeTime: "22:00" },
  { dayOfWeek: 3, openTime: "12:00", closeTime: "22:00" },
  { dayOfWeek: 4, openTime: "12:00", closeTime: "22:00" },
  { dayOfWeek: 5, openTime: "12:00", closeTime: "22:00" },
];

/** Return a Date that is `offsetMs` ms from now, snapped to a weekday at 14:00 */
function makeFutureWeekdayDate(offsetMs = 3600000) {
  const d = new Date(Date.now() + offsetMs);
  // Advance to Monday if weekend
  while (d.getDay() === 0 || d.getDay() === 6) {
    d.setDate(d.getDate() + 1);
  }
  d.setHours(14, 0, 0, 0);
  return d;
}

describe("isScheduledTimeValid", () => {
  it("returns false for a time in the past", () => {
    const past = new Date(Date.now() - 60000).toISOString();
    expect(isScheduledTimeValid(weekdayHours, past)).toBe(false);
  });

  it("returns true for a future time within opening hours on a weekday", () => {
    const future = makeFutureWeekdayDate().toISOString();
    expect(isScheduledTimeValid(weekdayHours, future)).toBe(true);
  });

  it("returns false for a future time outside opening hours (before open)", () => {
    const d = makeFutureWeekdayDate();
    d.setHours(10, 0, 0, 0); // 10:00 — before 12:00 open
    // Ensure still in the future
    const target = new Date(d);
    target.setDate(target.getDate() + 1);
    while (target.getDay() === 0 || target.getDay() === 6) {
      target.setDate(target.getDate() + 1);
    }
    target.setHours(10, 0, 0, 0);
    expect(isScheduledTimeValid(weekdayHours, target.toISOString())).toBe(false);
  });

  it("returns false for a future time outside opening hours (after close)", () => {
    const d = makeFutureWeekdayDate();
    d.setDate(d.getDate() + 1);
    while (d.getDay() === 0 || d.getDay() === 6) {
      d.setDate(d.getDate() + 1);
    }
    d.setHours(23, 0, 0, 0); // 23:00 — after 22:00 close
    expect(isScheduledTimeValid(weekdayHours, d.toISOString())).toBe(false);
  });

  it("returns false for a future time on a day with no opening hours (weekend)", () => {
    const d = new Date();
    // Find next Saturday
    d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7));
    d.setHours(14, 0, 0, 0);
    // weekdayHours has no Saturday entry
    expect(isScheduledTimeValid(weekdayHours, d.toISOString())).toBe(false);
  });

  it("returns true when no opening hours are configured (always open)", () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(isScheduledTimeValid([], future)).toBe(true);
  });

  it("returns true when opening hours are null (always open)", () => {
    const future = new Date(Date.now() + 3600000).toISOString();
    expect(isScheduledTimeValid(null, future)).toBe(true);
  });
});
