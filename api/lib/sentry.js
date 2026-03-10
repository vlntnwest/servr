/**
 * Sentry monitoring initialization.
 * Only activates when SENTRY_DSN is set.
 */

let Sentry = null;

if (process.env.SENTRY_DSN) {
  Sentry = require("@sentry/node");
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV || "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
  });
}

function captureException(err, context) {
  if (!Sentry) return;
  if (context) {
    Sentry.withScope((scope) => {
      Object.entries(context).forEach(([key, val]) => scope.setExtra(key, val));
      Sentry.captureException(err);
    });
  } else {
    Sentry.captureException(err);
  }
}

module.exports = { captureException };
