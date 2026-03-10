// Mock logger — no-op functions to prevent real pino from loading
const mockLogger = {
  info: () => {},
  error: () => {},
  warn: () => {},
  debug: () => {},
  trace: () => {},
  fatal: () => {},
};
module.exports = mockLogger;
