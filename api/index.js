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
const io = initSocket(server);

server.listen(PORT, () => {
  logger.info(`Listening on port ${PORT}`);
  verifySmtp();
});

// Graceful shutdown on SIGTERM (zero-downtime deploys)
process.on("SIGTERM", () => {
  logger.info("SIGTERM received — shutting down gracefully");
  server.close(async () => {
    logger.info("HTTP server closed");
    if (io) io.close();
    try {
      await require("./lib/prisma").$disconnect();
      logger.info("Prisma disconnected");
    } catch (err) {
      logger.error({ error: err.message }, "Error disconnecting Prisma");
    }
    process.exit(0);
  });
  // Force exit after 30s if graceful shutdown hangs
  setTimeout(() => {
    logger.error("Graceful shutdown timed out — forcing exit");
    process.exit(1);
  }, 30000).unref();
});
