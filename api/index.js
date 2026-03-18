require("dotenv").config({ path: "./.env" });
// Sentry must be initialized before everything else
require("./lib/sentry");

const http = require("http");
const app = require("./app");
const logger = require("./logger");
const { initSocket } = require("./lib/socket");
const { verifySmtp } = require("./lib/mailer");

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
const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
  logger.info(`Listening on port ${PORT}`);
  verifySmtp();
});
