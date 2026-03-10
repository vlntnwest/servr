require("dotenv").config({ path: "./.env" });
// Sentry must be initialized before everything else
require("./lib/sentry");

const app = require("./app");
const logger = require("./logger");

process.on("uncaughtException", (err) => {
  logger.fatal({ error: err.message, stack: err.stack }, "Uncaught exception");
  process.exit(1);
});

process.on("unhandledRejection", (reason) => {
  logger.fatal({ error: reason }, "Unhandled rejection");
  process.exit(1);
});

// server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  logger.info(`Listening on port ${PORT}`);
});
