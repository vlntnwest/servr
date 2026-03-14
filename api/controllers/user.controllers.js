const prisma = require("../lib/prisma");
const supabase = require("../lib/supabase");
const logger = require("../logger");

module.exports.getUserData = async (req, res, next) => {
  const { id } = req.user;

  try {
    const data = await prisma.user.findUnique({
      where: {
        id,
      },
    });

    if (!data) {
      logger.error("User not found");
      return res.status(404).json({ error: "User not found" });
    }

    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.updateUserData = async (req, res, next) => {
  const { id } = req.user;
  const { fullName, phone, address, city, zipCode } = req.body;

  try {
    const data = await prisma.user.update({
      where: { id },
      data: { fullName, phone, address, city, zipCode },
    });

    logger.info({ userId: data.id }, "User data updated successfully");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.getUserOrders = async (req, res, next) => {
  const { id } = req.user;
  const { limit, offset } = req.query; // Already validated and coerced by Zod

  try {
    const [orders, total] = await prisma.$transaction([
      prisma.order.findMany({
        where: { userId: id },
        orderBy: { createdAt: "desc" },
        take: limit,
        skip: offset,
        include: {
          restaurant: { select: { id: true, name: true, slug: true } },
          orderProducts: {
            include: {
              product: { select: { id: true, name: true } },
            },
          },
        },
      }),
      prisma.order.count({ where: { userId: id } }),
    ]);

    logger.info({ userId: id, count: orders.length }, "User orders fetched");
    return res.status(200).json({ data: { orders, total } });
  } catch (error) {
    next(error);
  }
};

module.exports.deleteUser = async (req, res, next) => {
  const { id } = req.user;

  try {
    await supabase.auth.admin.deleteUser(id);

    logger.info({ userId: id }, "User deleted successfully");
    return res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    next(error);
  }
};
