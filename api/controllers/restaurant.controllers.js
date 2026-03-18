const prisma = require("../lib/prisma");
const logger = require("../logger");

module.exports.getRestaurant = async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    const data = await prisma.restaurant.findUnique({
      where: { id: restaurantId },
    });

    if (!data) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    logger.info({ restaurantId }, "Restaurant retrieved");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.getRestaurantBySlug = async (req, res, next) => {
  const { slug } = req.params;

  try {
    const data = await prisma.restaurant.findUnique({
      where: { slug },
    });

    if (!data) {
      return res.status(404).json({ error: "Restaurant not found" });
    }

    logger.info({ slug }, "Restaurant retrieved by slug");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.createRestaurant = async (req, res, next) => {
  const user = req.user;
  const { name, slug, address, zipCode, city, phone, email, imageUrl } = req.body;

  try {
    const data = await prisma.$transaction(async (tx) => {
      const restaurant = await tx.restaurant.create({
        data: {
          name,
          slug,
          address,
          zipCode,
          city,
          phone,
          email,
          imageUrl,
        },
      });

      await tx.restaurantMember.create({
        data: {
          restaurantId: restaurant.id,
          userId: user.id,
          role: "OWNER",
        },
      });

      return restaurant;
    });
    logger.info({ responseId: data.id }, "Restaurant created successfully");
    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.updateRestaurant = async (req, res, next) => {
  const { restaurantId } = req.params;

  if (Object.keys(req.body).length === 0) {
    logger.error("No data to update");
    return res.status(400).json({ error: "No data" });
  }

  try {
    const data = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: req.body,
    });

    logger.info({ responseId: data.id }, "Restaurant updated successfully");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.deleteRestaurant = async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    await prisma.restaurant.delete({
      where: { id: restaurantId },
    });

    logger.info({ restaurantId }, "Restaurant deleted successfully");
    return res
      .status(200)
      .json({ message: "Restaurant deleted successfully" });
  } catch (error) {
    next(error);
  }
};

module.exports.updatePreparationLevel = async (req, res, next) => {
  const { restaurantId } = req.params;
  const { preparationLevel } = req.body;

  try {
    const data = await prisma.restaurant.update({
      where: { id: restaurantId },
      data: { preparationLevel },
    });

    logger.info({ restaurantId, preparationLevel }, "Preparation level updated");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};
