// Shared mock prisma client accessible via globalThis.__mockPrisma
if (!globalThis.__mockPrisma) {
  globalThis.__mockPrisma = {};
}
module.exports = globalThis.__mockPrisma;
