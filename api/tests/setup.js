import Module from "module";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const loggerPath = resolve(__dirname, "..", "logger.js");
const mockMap = {
  "lib/prisma": resolve(__dirname, "__mocks__/prisma.mock.js"),
  "lib/supabase": resolve(__dirname, "__mocks__/supabase.mock.js"),
  [loggerPath]: resolve(__dirname, "__mocks__/logger.mock.js"),
};

// Patch Node's module resolution to redirect specific requires to mocks
const originalResolve = Module._resolveFilename;
Module._resolveFilename = function (request, parent, ...args) {
  const resolved = originalResolve.call(this, request, parent, ...args);
  for (const [pattern, mockPath] of Object.entries(mockMap)) {
    if (resolved.includes(pattern)) {
      return mockPath;
    }
  }
  return resolved;
};
