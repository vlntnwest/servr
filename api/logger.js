const pino = require("pino");

let transport;

if (process.env.NODE_ENV !== "production") {
  transport = pino.transport({ target: "pino-pretty", options: { colorize: true } });
} else if (process.env.LOGTAIL_SOURCE_TOKEN) {
  transport = pino.transport({
    targets: [
      { target: "pino/file", options: { destination: 1 }, level: "info" },
      {
        target: "@logtail/pino",
        options: { sourceToken: process.env.LOGTAIL_SOURCE_TOKEN },
        level: "info",
      },
    ],
  });
}

module.exports = pino({}, transport);
