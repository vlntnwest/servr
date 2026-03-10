const pino = require("pino");

const transport =
  process.env.NODE_ENV !== "production"
    ? pino.transport({ target: "pino-pretty", options: { colorize: true } })
    : undefined;

module.exports = pino({}, transport);
