const Stripe = require("stripe");
const prisma = require("../lib/prisma");
const logger = require("../logger");

const stripe = process.env.STRIPE_SECRET_KEY
  ? new Stripe(process.env.STRIPE_SECRET_KEY)
  : null;

module.exports.initiateStripeOnboarding = async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    // If already has an account, check whether charges are already enabled
    if (restaurant.stripeAccountId) {
      const existing = await stripe.accounts.retrieve(restaurant.stripeAccountId);
      if (existing.charges_enabled) {
        return res
          .status(409)
          .json({ error: "Stripe account already active with charges enabled" });
      }
    }

    let stripeAccountId = restaurant.stripeAccountId;

    // Create a new Express account if none exists yet
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        email: restaurant.email || undefined,
      });
      stripeAccountId = account.id;
      await prisma.restaurant.update({
        where: { id: restaurantId },
        data: { stripeAccountId },
      });
      logger.info({ restaurantId, stripeAccountId }, "Stripe Express account created");
    }

    const link = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${process.env.CLIENT_URL}/admin/stripe/refresh`,
      return_url: `${process.env.CLIENT_URL}/admin/stripe/return`,
      type: "account_onboarding",
    });

    logger.info({ restaurantId, stripeAccountId }, "Stripe account link created");
    return res.status(200).json({ data: { url: link.url } });
  } catch (error) {
    next(error);
  }
};

module.exports.getStripeStatus = async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    const restaurant = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!restaurant) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    if (!restaurant.stripeAccountId) {
      return res.status(200).json({ data: { connected: false } });
    }

    if (!stripe) {
      return res.status(503).json({ error: "Stripe is not configured" });
    }

    const account = await stripe.accounts.retrieve(restaurant.stripeAccountId);

    logger.info(
      {
        restaurantId,
        stripeAccountId: restaurant.stripeAccountId,
        chargesEnabled: account.charges_enabled,
      },
      "Stripe status retrieved",
    );

    return res.status(200).json({
      data: {
        connected: true,
        chargesEnabled: account.charges_enabled,
        detailsSubmitted: account.details_submitted,
      },
    });
  } catch (error) {
    next(error);
  }
};
