const prisma = require("../lib/prisma");
const logger = require("../logger");

module.exports.createPromoCode = async (req, res, next) => {
  const { restaurantId } = req.params;
  const { code, discountType, discountValue, minOrderAmount, maxUses, expiresAt, isActive } = req.body;

  try {
    const data = await prisma.promoCode.create({
      data: {
        restaurantId,
        code: code.toUpperCase(),
        discountType,
        discountValue,
        minOrderAmount: minOrderAmount || null,
        maxUses: maxUses || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
        isActive,
      },
    });

    logger.info({ restaurantId, code: data.code }, "Promo code created");
    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.getPromoCodes = async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    const data = await prisma.promoCode.findMany({
      where: { restaurantId },
      orderBy: { createdAt: "desc" },
    });

    logger.info({ restaurantId }, "Promo codes retrieved");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.deletePromoCode = async (req, res, next) => {
  const { promoCodeId } = req.params;

  try {
    await prisma.promoCode.delete({ where: { id: promoCodeId } });

    logger.info({ promoCodeId }, "Promo code deleted");
    return res.status(200).json({ message: "Promo code deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports.validatePromoCode = async (req, res, next) => {
  const { restaurantId } = req.params;
  const { code, orderTotal } = req.body;

  try {
    const promo = await prisma.promoCode.findUnique({
      where: { restaurantId_code: { restaurantId, code: code.toUpperCase() } },
    });

    if (!promo) {
      return res.status(404).json({ error: "Promo code not found" });
    }
    if (!promo.isActive) {
      return res.status(400).json({ error: "Promo code is inactive" });
    }
    if (promo.expiresAt && promo.expiresAt < new Date()) {
      return res.status(400).json({ error: "Promo code has expired" });
    }
    if (promo.maxUses !== null && promo.usedCount >= promo.maxUses) {
      return res.status(400).json({ error: "Promo code usage limit reached" });
    }
    if (promo.minOrderAmount !== null && orderTotal < parseFloat(promo.minOrderAmount)) {
      return res.status(400).json({
        error: `Minimum order amount of ${promo.minOrderAmount} required`,
      });
    }

    let discountAmount;
    if (promo.discountType === "PERCENTAGE") {
      discountAmount = (orderTotal * parseFloat(promo.discountValue)) / 100;
    } else {
      discountAmount = Math.min(parseFloat(promo.discountValue), orderTotal);
    }

    const finalTotal = Math.max(0, orderTotal - discountAmount);

    logger.info({ restaurantId, code: promo.code }, "Promo code validated");
    return res.status(200).json({
      data: {
        code: promo.code,
        discountType: promo.discountType,
        discountValue: parseFloat(promo.discountValue),
        discountAmount: Math.round(discountAmount * 100) / 100,
        finalTotal: Math.round(finalTotal * 100) / 100,
      },
    });
  } catch (error) {
    next(error);
  }
};
