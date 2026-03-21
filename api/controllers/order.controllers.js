const prisma = require("../lib/prisma");
const logger = require("../logger");
const { sendOrderConfirmation, sendOrderStatusUpdate } = require("../lib/mailer");
const { withOrderNumber } = require("../lib/orderNumber");
const { isValidTransition, getNextStatuses } = require("../lib/orderStateMachine");
const { getIO } = require("../lib/socket");
const { isRestaurantOpen, isScheduledTimeValid } = require("../lib/openingHours");
const { refundStripePayment } = require("./checkout.controllers");

module.exports.createOrder = async (req, res, next) => {
  const { restaurantId } = req.params;
  const { fullName, phone, email, items, promoCode, scheduledFor } = req.body;

  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    const openingHours = await prisma.openingHour.findMany({
      where: { restaurantId },
    });
    if (scheduledFor) {
      if (!isScheduledTimeValid(openingHours, scheduledFor)) {
        return res.status(400).json({ error: "Scheduled time is outside opening hours or in the past" });
      }
    } else {
      if (restaurant.preparationLevel === "CLOSED") {
        return res.status(400).json({ error: "Restaurant is currently closed" });
      }
      if (!(await isRestaurantOpen(restaurantId, openingHours))) {
        return res.status(400).json({ error: "Restaurant is currently closed" });
      }
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, restaurantId },
    });

    if (products.length !== productIds.length) {
      return res.status(404).json({ error: "One or more products not found" });
    }

    const unavailable = products.filter((p) => !p.isAvailable);
    if (unavailable.length > 0) {
      return res.status(400).json({
        error: `Unavailable products: ${unavailable.map((p) => p.name).join(", ")}`,
      });
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

    const data = await withOrderNumber(async (tx, orderNumber) => {
      const order = await tx.order.create({
        data: { restaurantId, fullName, phone, email, totalPrice, orderNumber, scheduledFor: scheduledFor ? new Date(scheduledFor) : null },
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

    const io = getIO();
    if (io) {
      io.to(`restaurant:${restaurantId}`).emit("order:new", data);
    }

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

  const VALID_STATUSES = [
    "PENDING",
    "PENDING_ON_SITE_PAYMENT",
    "IN_PROGRESS",
    "COMPLETED",
    "DELIVERED",
    "CANCELLED",
  ];
  const statusParam = req.query.status;
  const statusFilter = statusParam
    ? statusParam.split(",").filter((s) => VALID_STATUSES.includes(s))
    : null;

  const where = {
    restaurantId,
    ...(statusFilter?.length ? { status: { in: statusFilter } } : {}),
  };

  try {
    const [data, total] = await Promise.all([
      prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          orderProducts: {
            include: {
              product: true,
              orderProductOptions: {
                include: { optionChoice: { include: { optionGroup: true } } },
              },
            },
          },
        },
      }),
      prisma.order.count({ where }),
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
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { id: true, status: true, email: true, restaurantId: true, stripePaymentIntentId: true, stripeRefundId: true, fullName: true, orderNumber: true },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!isValidTransition(order.status, status)) {
      return res.status(400).json({
        error: `Invalid transition from ${order.status} to ${status}`,
        allowedTransitions: getNextStatuses(order.status),
      });
    }

    if (status === "CANCELLED" && order.stripePaymentIntentId && !order.stripeRefundId) {
      await refundStripePayment(order);
    }

    // Atomic update: only update if status hasn't changed since we read it (prevents race conditions)
    const updated = await prisma.order.updateMany({
      where: { id: orderId, status: order.status },
      data: { status },
    });

    if (updated.count === 0) {
      // Status changed between findUnique and updateMany — return current state
      const current = await prisma.order.findUnique({
        where: { id: orderId },
        select: { id: true, status: true },
      });
      return res.status(409).json({
        error: "Order status was modified concurrently",
        currentStatus: current?.status,
      });
    }

    const data = await prisma.order.findUnique({ where: { id: orderId } });

    const io = getIO();
    if (io) {
      io.to(`restaurant:${order.restaurantId}`).emit("order:statusUpdated", data);
    }

    sendOrderStatusUpdate({ to: order.email, order: data, newStatus: status });

    logger.info({ orderId, restaurantId: order.restaurantId, from: order.status, to: status }, "Order status updated");
    return res.status(200).json({ data, allowedTransitions: getNextStatuses(status) });
  } catch (error) {
    next(error);
  }
};

// Intentionally public (no auth) — returns minimal order info for confirmation pages.
// Order IDs are UUIDs and not guessable.
module.exports.getOrderPublic = async (req, res, next) => {
  const { orderId } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: {
        id: true,
        orderNumber: true,
        status: true,
        totalPrice: true,
        createdAt: true,
      },
    });

    if (!order) {
      return res.status(404).json({ error: "Order not found" });
    }

    logger.info({ orderId }, "Public order lookup");
    return res.status(200).json({ data: order });
  } catch (error) {
    next(error);
  }
};
