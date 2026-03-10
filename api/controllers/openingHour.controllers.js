const prisma = require("../lib/prisma");
const logger = require("../logger");

module.exports.getOpeningHours = async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    const data = await prisma.openingHour.findMany({
      where: { restaurantId },
      orderBy: { order: "asc" },
    });

    logger.info({ restaurantId }, "Opening hours retrieved");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.updateOpeningHours = async (req, res, next) => {
  const { restaurantId } = req.params;
  const hours = req.body;

  try {
    const data = await prisma.$transaction(async (tx) => {
      await tx.openingHour.deleteMany({ where: { restaurantId } });

      if (hours.length > 0) {
        await tx.openingHour.createMany({
          data: hours.map((h) => ({
            restaurantId,
            dayOfWeek: h.dayOfWeek,
            openTime: h.openTime,
            closeTime: h.closeTime,
            order: h.order,
          })),
        });
      }

      return tx.openingHour.findMany({
        where: { restaurantId },
        orderBy: { order: "asc" },
      });
    });

    logger.info({ restaurantId }, "Opening hours updated");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};
