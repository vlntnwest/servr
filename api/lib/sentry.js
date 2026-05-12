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
    release: process.env.SENTRY_RELEASE || process.env.npm_package_version,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    enableLogs: true,
    integrations: [
      Sentry.consoleLoggingIntegration({ levels: ["log", "warn", "error"] }),
    ],
    beforeSend(event, hint) {
      const err = hint?.originalException;
      const status = err?.statusCode;
      // Always capture Stripe API errors regardless of status
      if (err?.type && String(err.type).startsWith("Stripe")) return event;
      // Drop expected client errors (validation, auth, not found, etc.)
      if (status && status < 500) return null;
      return event;
    },
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

module.exports = { captureException, Sentry };
