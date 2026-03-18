const prisma = require("../lib/prisma");
const logger = require("../logger");

module.exports.getExceptionalHours = async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    const data = await prisma.exceptionalHour.findMany({
      where: { restaurantId },
      orderBy: { date: "asc" },
    });

    logger.info({ restaurantId }, "Exceptional hours retrieved");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.createExceptionalHour = async (req, res, next) => {
  const { restaurantId } = req.params;
  const { date, isClosed, openTime, closeTime, label } = req.body;

  try {
    const data = await prisma.exceptionalHour.create({
      data: {
        restaurantId,
        date: new Date(date),
        isClosed: isClosed ?? true,
        openTime: isClosed ? null : openTime || null,
        closeTime: isClosed ? null : closeTime || null,
        label: label || null,
      },
    });

    logger.info({ restaurantId, date }, "Exceptional hour created");
    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.deleteExceptionalHour = async (req, res, next) => {
  const { exceptionalHourId } = req.params;

  try {
    await prisma.exceptionalHour.delete({ where: { id: exceptionalHourId } });

    logger.info({ exceptionalHourId }, "Exceptional hour deleted");
    return res.status(200).json({ message: "Exceptional hour deleted" });
  } catch (error) {
    next(error);
  }
};
