const Stripe = require("stripe");
const prisma = require("../lib/prisma");
const logger = require("../logger");
const { sendOrderConfirmation } = require("../lib/mailer");
const { withOrderNumber } = require("../lib/orderNumber");

function isRestaurantOpen(openingHours) {
  if (!openingHours || openingHours.length === 0) return true;
  const now = new Date();
  const dayOfWeek = now.getDay();
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const todayHours = openingHours.find((h) => h.dayOfWeek === dayOfWeek);
  if (!todayHours) return false;
  return currentTime >= todayHours.openTime && currentTime < todayHours.closeTime;
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// Platform commission: 5% (in cents)
const PLATFORM_FEE_PERCENT = 0.05;

module.exports.createCheckoutSession = async (req, res, next) => {
  const { restaurantId, fullName, phone, email, items } = req.body;

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

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

    // Fallback: restaurant has no Stripe account → create order for on-site payment
    if (!restaurant.stripeAccountId) {
      let totalPrice = 0;
      for (const item of items) {
        const product = productMap.get(item.productId);
        const basePrice = parseFloat(product.price);
        const optionsPrice = (item.optionChoiceIds || []).reduce(
          (sum, ocId) => {
            const oc = optionChoiceMap.get(ocId);
            return sum + (oc ? parseFloat(oc.priceModifier) : 0);
          },
          0,
        );
        totalPrice += (basePrice + optionsPrice) * item.quantity;
      }

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
          },
        });

        for (const item of items) {
          const orderProduct = await tx.orderProduct.create({
            data: {
              orderId: created.id,
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
          where: { id: created.id },
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

      logger.info(
        { orderId: order.id, restaurantId },
        "On-site payment order created (no Stripe account)",
      );
      sendOrderConfirmation({ to: order.email, order });
      return res
        .status(201)
        .json({ data: { order, paymentMethod: "on_site" } });
    }

    // Stripe Connect: build line items
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
    const applicationFeeAmount = Math.round(
      totalAmountCents * PLATFORM_FEE_PERCENT,
    );

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${process.env.CLIENT_URL}/order/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.CLIENT_URL}/order/cancel`,
      customer_email: email || undefined,
      payment_intent_data: {
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: restaurant.stripeAccountId,
        },
      },
      metadata: {
        restaurantId,
        fullName: fullName || "",
        phone: phone || "",
        email: email || "",
        items: JSON.stringify(items),
      },
    });

    logger.info(
      { sessionId: session.id, restaurantId },
      "Stripe Connect checkout session created",
    );
    return res
      .status(201)
      .json({ data: { sessionId: session.id, url: session.url } });
  } catch (error) {
    next(error);
  }
};

module.exports.handleWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(req.body, sig, WEBHOOK_SECRET);
  } catch (err) {
    logger.warn({ error: err.message }, "Stripe webhook signature verification failed");
    return res.status(400).json({ error: `Webhook error: ${err.message}` });
  }

  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const { restaurantId, fullName, phone, email } = session.metadata;
    const items = JSON.parse(session.metadata.items || "[]");
    const totalPrice = session.amount_total / 100;

    try {
      const order = await withOrderNumber(async (tx, orderNumber) => {
        const created = await tx.order.create({
          data: {
            restaurantId,
            fullName: fullName || null,
            phone: phone || null,
            email: email || null,
            totalPrice,
            status: "PENDING",
            stripePaymentIntentId: session.payment_intent || null,
            orderNumber,
          },
        });

        for (const item of items) {
          const orderProduct = await tx.orderProduct.create({
            data: {
              orderId: created.id,
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

        return created;
      });

      logger.info(
        { orderId: order.id, restaurantId, sessionId: session.id },
        "Order created from Stripe webhook",
      );
      sendOrderConfirmation({ to: email || null, order });
    } catch (err) {
      logger.error(
        { error: err.message, sessionId: session.id, restaurantId },
        "Failed to create order from webhook",
      );
      // Return 500 so Stripe retries the webhook
      return res.status(500).json({ error: "Failed to create order" });
    }
  }

  res.status(200).json({ received: true });
};

module.exports.refundOrder = async (req, res, next) => {
  const { restaurantId, orderId } = req.params;

  try {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
    });

    if (!order || order.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Order not found" });
    }

    if (!order.stripePaymentIntentId) {
      return res
        .status(400)
        .json({ error: "No Stripe payment associated with this order" });
    }

    if (order.status === "CANCELLED") {
      return res.status(409).json({ error: "Order is already cancelled" });
    }

    const refund = await stripe.refunds.create({
      payment_intent: order.stripePaymentIntentId,
      reverse_transfer: true,
    });

    const updated = await prisma.order.update({
      where: { id: orderId },
      data: { status: "CANCELLED" },
    });

    logger.info(
      { orderId, restaurantId, refundId: refund.id },
      "Order refunded and cancelled",
    );
    return res.status(200).json({ data: { order: updated, refund: { id: refund.id, status: refund.status } } });
  } catch (error) {
    next(error);
  }
};
