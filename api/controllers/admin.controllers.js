const prisma = require("../lib/prisma");
const logger = require("../logger");

module.exports.cleanupDraftOrders = async (req, res, next) => {
  try {
    const cutoff = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const result = await prisma.order.deleteMany({
      where: { status: "DRAFT", createdAt: { lt: cutoff } },
    });
    logger.info({ deletedCount: result.count, cutoff }, "Stale DRAFT orders cleaned up");
    return res.status(200).json({ data: { deletedCount: result.count } });
  } catch (error) {
    next(error);
  }
};
