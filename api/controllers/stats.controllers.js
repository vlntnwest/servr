const prisma = require("../lib/prisma");
const logger = require("../logger");

module.exports.getStats = async (req, res, next) => {
  const { restaurantId } = req.params;
  const { period = "month" } = req.query;

  const now = new Date();
  let since;
  if (period === "day") {
    since = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (period === "week") {
    const day = now.getDay(); // 0=Sunday
    since = new Date(now);
    since.setDate(now.getDate() - day);
    since.setHours(0, 0, 0, 0);
  } else {
    // month (default)
    since = new Date(now.getFullYear(), now.getMonth(), 1);
  }

  try {
    const orders = await prisma.order.findMany({
      where: {
        restaurantId,
        createdAt: { gte: since },
        status: { notIn: ["CANCELLED"] },
      },
      include: {
        orderProducts: {
          include: { product: true },
        },
      },
    });

    const totalOrders = orders.length;
    const revenue = orders.reduce(
      (sum, o) => sum + parseFloat(o.totalPrice),
      0,
    );

    // Count product occurrences
    const productCount = {};
    for (const order of orders) {
      for (const op of order.orderProducts) {
        const name = op.product?.name || "Unknown";
        productCount[name] = (productCount[name] || 0) + op.quantity;
      }
    }
    const popularProducts = Object.entries(productCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    logger.info({ restaurantId, period }, "Stats retrieved");
    return res.status(200).json({
      data: {
        period,
        since: since.toISOString(),
        totalOrders,
        revenue: parseFloat(revenue.toFixed(2)),
        popularProducts,
      },
    });
  } catch (error) {
    next(error);
  }
};
