const Stripe = require("stripe");
const prisma = require("../lib/prisma");
const logger = require("../logger");
const { sendOrderConfirmation } = require("../lib/mailer");
const { withOrderNumber } = require("../lib/orderNumber");
const { isScheduledTimeValid } = require("./order.controllers");
const { getIO } = require("../lib/socket");
const { isRestaurantOpen } = require("../lib/openingHours");

const stripe = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

/**
 * Refund a Stripe payment for an order if applicable.
 * Returns the refund object or null if no refund was needed.
 */
async function refundStripePayment(order) {
  if (!stripe || !order.stripePaymentIntentId || order.stripeRefundId) return null;

  const restaurant = await prisma.restaurant.findUnique({ where: { id: order.restaurantId } });
  if (!restaurant || !restaurant.stripeAccountId) return null;

  const refund = await stripe.refunds.create(
    { payment_intent: order.stripePaymentIntentId },
    { stripeAccount: restaurant.stripeAccountId, idempotencyKey: `refund_${order.id}` },
  );

  await prisma.order.update({
    where: { id: order.id },
    data: { stripeRefundId: refund.id },
  });

  logger.info({ orderId: order.id, refundId: refund.id }, "Stripe payment refunded");
  return refund;
}

const PLATFORM_FEE_PERCENT = 0.05;

const ORDER_INCLUDE = {
  orderProducts: {
    include: {
      product: true,
      orderProductOptions: { include: { optionChoice: true } },
    },
  },
};

async function createOrderProducts(tx, orderId, items) {
  for (const item of items) {
    const orderProduct = await tx.orderProduct.create({
      data: { orderId, productId: item.productId, quantity: item.quantity },
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
}

// ─── createCheckoutSession ────────────────────────────────────────────────────

module.exports.createCheckoutSession = async (req, res, next) => {
  const { restaurantId, fullName, phone, email, items, scheduledFor } = req.body;

  try {
    const restaurant = await prisma.restaurant.findUnique({ where: { id: restaurantId } });
    if (!restaurant) return res.status(404).json({ error: "Restaurant not found" });

    if (restaurant.preparationLevel === "CLOSED") {
      return res.status(400).json({ error: "Restaurant is currently closed" });
    }

    const openingHours = await prisma.openingHour.findMany({ where: { restaurantId } });
    if (scheduledFor) {
      if (!isScheduledTimeValid(openingHours, scheduledFor)) {
        return res.status(400).json({ error: "Scheduled time is outside opening hours or in the past" });
      }
    } else if (!(await isRestaurantOpen(restaurantId, openingHours))) {
      return res.status(400).json({ error: "Restaurant is currently closed" });
    }

    const productIds = [...new Set(items.map((i) => i.productId))];
    const products = await prisma.product.findMany({ where: { id: { in: productIds }, restaurantId } });
    if (products.length !== productIds.length) {
      return res.status(404).json({ error: "One or more products not found" });
    }

    const unavailable = products.filter((p) => !p.isAvailable);
    if (unavailable.length > 0) {
      return res.status(400).json({
        error: `Unavailable products: ${unavailable.map((p) => p.name).join(", ")}`,
      });
    }

    const allOptionChoiceIds = [...new Set(items.flatMap((i) => i.optionChoiceIds || []))];
    const optionChoices = allOptionChoiceIds.length > 0
      ? await prisma.optionChoice.findMany({ where: { id: { in: allOptionChoiceIds } } })
      : [];

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

    // ── On-site payment (no Stripe account) ──────────────────────────────────
    if (!restaurant.stripeAccountId) {
      const order = await withOrderNumber(async (tx, orderNumber) => {
        const created = await tx.order.create({
          data: {
            restaurantId,
            fullName,
            phone,
            email,
            totalPrice,
            status: "PENDING_ON_SITE_PAYMENT",
            orderNumber,
            scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
          },
        });
        await createOrderProducts(tx, created.id, items);
        return tx.order.findUnique({ where: { id: created.id }, include: ORDER_INCLUDE });
      });

      logger.info({ orderId: order.id, restaurantId }, "On-site payment order created");
      sendOrderConfirmation({ to: order.email, order });

      const io = getIO();
      if (io) {
        io.to(`restaurant:${restaurantId}`).emit("order:new", order);
      }

      return res.status(201).json({ data: { order, paymentMethod: "on_site" } });
    }

    // ── Stripe: create DRAFT order, then Stripe session ──────────────────────
    const draftOrder = await prisma.$transaction(async (tx) => {
      const created = await tx.order.create({
        data: {
          restaurantId,
          fullName,
          phone,
          email,
          totalPrice,
          status: "DRAFT",
          scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
        },
      });
      await createOrderProducts(tx, created.id, items);
      return created;
    });

    const lineItems = items.map((item) => {
      const product = productMap.get(item.productId);
      const basePrice = parseFloat(product.price);
      const optionNames = [];
      const optionsTotal = (item.optionChoiceIds || []).reduce((sum, ocId) => {
        const oc = optionChoiceMap.get(ocId);
        if (oc) optionNames.push(oc.name);
        return sum + (oc ? parseFloat(oc.priceModifier) : 0);
      }, 0);

      const unitAmount = Math.round((basePrice + optionsTotal) * 100);
      const productName = optionNames.length
        ? `${product.name} (${optionNames.join(", ")})`
        : product.name;

      return {
        price_data: {
          currency: "eur",
          product_data: {
            name: productName,
            ...(product.imageUrl && { images: [product.imageUrl] }),
          },
          unit_amount: unitAmount,
        },
        quantity: item.quantity,
      };
    });

    const totalAmountCents = lineItems.reduce(
      (sum, li) => sum + li.price_data.unit_amount * li.quantity,
      0,
    );
    const applicationFeeAmount = Math.round(totalAmountCents * PLATFORM_FEE_PERCENT);

    const session = await stripe.checkout.sessions.create(
      {
        payment_method_types: ["card"],
        line_items: lineItems,
        mode: "payment",
        success_url: `${process.env.CLIENT_URL}/store/${restaurant.slug}/order/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${process.env.CLIENT_URL}/store/${restaurant.slug}/order/cancel`,
        customer_email: email || undefined,
        expires_at: Math.floor(Date.now() / 1000) + 30 * 60,
        payment_intent_data: {
          application_fee_amount: applicationFeeAmount,
          metadata: { orderId: draftOrder.id },
        },
        metadata: { orderId: draftOrder.id },
      },
      { stripeAccount: restaurant.stripeAccountId },
    );

    await prisma.order.update({
      where: { id: draftOrder.id },
      data: { stripeSessionId: session.id },
    });

    logger.info(
      { orderId: draftOrder.id, sessionId: session.id, restaurantId },
      "Stripe checkout session created",
    );
    return res.status(201).json({ data: { sessionId: session.id, url: session.url } });
  } catch (error) {
    next(error);
  }
};

// ─── handleWebhook ────────────────────────────────────────────────────────────

module.exports.handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    logger.warn({ error: err.message }, "Stripe webhook signature verification failed");
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  try {
    if (event.type === "checkout.session.completed") {
      const session = event.data.object;
      const { orderId } = session.metadata;

      const order = await withOrderNumber(async (tx, orderNumber) => {
        const existing = await tx.order.findUnique({
          where: { id: orderId },
          select: { id: true, status: true },
        });
        if (!existing || ["PENDING", "CANCELLED"].includes(existing.status)) return null;

        return tx.order.update({
          where: { id: orderId },
          data: {
            status: "PENDING",
            orderNumber,
            stripePaymentIntentId: session.payment_intent || null,
          },
          include: ORDER_INCLUDE,
        });
      });

      if (order) {
        logger.info({ orderId, sessionId: session.id }, "Order confirmed from Stripe webhook");
        sendOrderConfirmation({ to: order.email, order });

        const io = getIO();
        if (io) {
          io.to(`restaurant:${order.restaurantId}`).emit("order:new", order);
        }
      }
    }

    if (event.type === "checkout.session.expired") {
      const session = event.data.object;
      const { orderId } = session.metadata;

      await prisma.order.updateMany({
        where: { id: orderId, status: { notIn: ["PENDING", "CANCELLED"] } },
        data: { status: "ABANDONED" },
      });

      logger.info({ orderId, sessionId: session.id }, "Order marked as ABANDONED");
    }

    if (event.type === "payment_intent.payment_failed") {
      const paymentIntent = event.data.object;
      const { orderId } = paymentIntent.metadata || {};

      if (orderId) {
        await prisma.order.updateMany({
          where: { id: orderId, status: "DRAFT" },
          data: { status: "PAYMENT_FAILED" },
        });
        logger.info({ orderId, paymentIntentId: paymentIntent.id }, "Order marked as PAYMENT_FAILED");
      }
    }

    if (event.type === "account.updated") {
      const account = event.data.object;
      if (account.charges_enabled) {
        logger.info({ stripeAccountId: account.id }, "Stripe Connect account charges_enabled");
      }
    }
  } catch (err) {
    logger.error({ error: err.message, eventType: event.type }, "Failed to process webhook event");
    return res.status(500).json({ error: "Failed to process webhook" });
  }

  res.status(200).json({ received: true });
};

// ─── refundOrder ──────────────────────────────────────────────────────────────

module.exports.refundOrder = async (req, res, next) => {
  const { restaurantId, orderId } = req.params;

  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const order = await prisma.order.findUnique({ where: { id: orderId } });

    if (!order || order.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.stripePaymentIntentId) {
      return res.status(400).json({ error: "No Stripe payment associated with this order" });
    }

    if (order.status === "CANCELLED") {
      return res.status(409).json({ error: "Order is already cancelled" });
    }

    if (order.stripeRefundId) {
      return res.status(409).json({ error: "Order has already been refunded" });
    }

    const refund = await refundStripePayment(order);

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    logger.info({ orderId, restaurantId, refundId: refund?.id }, "Order refunded and cancelled");
    return res.status(200).json({
      data: { order: updated, refund: refund ? { id: refund.id, status: refund.status } : null },
    });
  } catch (error) {
    next(error);
  }
};

module.exports.refundStripePayment = refundStripePayment;
