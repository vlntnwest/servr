const prisma = require("../lib/prisma");
const logger = require("../logger");
const { sendOrderConfirmation } = require("../lib/mailer");

function isRestaurantOpen(openingHours) {
  if (!openingHours || openingHours.length === 0) return true;
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayHours = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!todayHours) return false;
  return currentTime >= todayHours.openTime && currentTime < todayHours.closeTime;
}

module.exports.createOrder = async (req, res, next) => {
  const { restaurantId } = req.params;
  const { fullName, phone, email, items, promoCode } = req.body;

  try {
    const openingHours = await prisma.openingHour.findMany({
      where: { restaurantId },
    });
    if (!isRestaurantOpen(openingHours)) {
      return res.status(400).json({ error: "Restaurant is currently closed" });
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, restaurantId },
    });

    if (products.length !== productIds.length) {
      return res.status(404).json({ error: "One or more products not found" });
    }

    const allOptionChoiceIds = [
      ...new Set(items.flatMap((i) => i.optionChoiceIds || [])),
    ];
    let optionChoices = [];
    if (allOptionChoiceIds.length > 0) {
      optionChoices = await prisma.optionChoice.findMany({
        where: { id: { in: allOptionChoiceIds } },
      });
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    const optionChoiceMap = new Map(optionChoices.map((oc) => [oc.id, oc]));

    let totalPrice = 0;
    for (const item of items) {
      const product = productMap.get(item.productId);
      const basePrice = parseFloat(product.price);
      const optionsPrice = (item.optionChoiceIds || []).reduce((sum, ocId) => {
        const oc = optionChoiceMap.get(ocId);
        return sum + (oc ? parseFloat(oc.priceModifier) : 0);
      }, 0);
      totalPrice += (basePrice + optionsPrice) * item.quantity;
    }

    let appliedPromoCode = null;
    if (promoCode) {
      appliedPromoCode = await prisma.promoCode.findUnique({
        where: { restaurantId_code: { restaurantId, code: promoCode.toUpperCase() } },
      });
      if (!appliedPromoCode || !appliedPromoCode.isActive) {
        return res.status(400).json({ error: "Invalid or inactive promo code" });
      }
      if (appliedPromoCode.expiresAt && appliedPromoCode.expiresAt < new Date()) {
        return res.status(400).json({ error: "Promo code has expired" });
      }
      if (appliedPromoCode.maxUses !== null && appliedPromoCode.usedCount >= appliedPromoCode.maxUses) {
        return res.status(400).json({ error: "Promo code usage limit reached" });
      }
      if (appliedPromoCode.minOrderAmount !== null && totalPrice < parseFloat(appliedPromoCode.minOrderAmount)) {
        return res.status(400).json({ error: `Minimum order amount of ${appliedPromoCode.minOrderAmount} required` });
      }

      const discountValue = parseFloat(appliedPromoCode.discountValue);
      if (appliedPromoCode.discountType === "PERCENTAGE") {
        totalPrice = totalPrice * (1 - discountValue / 100);
      } else {
        totalPrice = Math.max(0, totalPrice - discountValue);
      }
      totalPrice = Math.round(totalPrice * 100) / 100;
    }

    const data = await prisma.$transaction(async (tx) => {
      const order = await tx.order.create({
        data: { restaurantId, fullName, phone, email, totalPrice },
      });

      if (appliedPromoCode) {
        await tx.promoCode.update({
          where: { id: appliedPromoCode.id },
          data: { usedCount: { increment: 1 } },
        });
      }

      for (const item of items) {
        const orderProduct = await tx.orderProduct.create({
          data: {
            orderId: order.id,
            productId: item.productId,
            quantity: item.quantity,
          },
        });

        if (item.optionChoiceIds && item.optionChoiceIds.length > 0) {
          await tx.orderProductOption.createMany({
            data: item.optionChoiceIds.map((ocId) => ({
              orderProductId: orderProduct.id,
              optionChoiceId: ocId,
            })),
          });
        }
      }

      return tx.order.findUnique({
        where: { id: order.id },
        include: {
          orderProducts: {
            include: {
              product: true,
              orderProductOptions: { include: { optionChoice: true } },
            },
          },
        },
      });
    });

    logger.info({ orderId: data.id, restaurantId }, "Order created");
    sendOrderConfirmation({ to: data.email, order: data });
    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.getOrders = async (req, res, next) => {
  const { restaurantId } = req.params;
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
  const skip = (page - 1) * limit;

  try {
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where: { restaurantId },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          orderProducts: {
            include: {
              product: true,
              orderProductOptions: { include: { optionChoice: true } },
            },
          },
        },
      }),
      prisma.order.count({ where: { restaurantId } }),
    ]);

    logger.info({ restaurantId, page, limit }, "Orders retrieved");
    return res.status(200).json({
      data,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

module.exports.getOrder = async (req, res, next) => {
  const { orderId } = req.params;

  try {
    const data = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        orderProducts: {
          include: {
            product: true,
            orderProductOptions: { include: { optionChoice: true } },
          },
        },
      },
    });

    if (!data) {
      return res.status(404).json({ error: "Order not found" });
    }

    logger.info({ orderId }, "Order retrieved");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.updateOrderStatus = async (req, res, next) => {
  const { orderId } = req.params;
  const { status } = req.body;

  try {
    const data = await prisma.order.update({
      where: { id: orderId },
      data: { status },
    });

    logger.info({ orderId, status }, "Order status updated");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};
