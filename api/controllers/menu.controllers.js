const prisma = require("../lib/prisma");
const logger = require("../logger");

module.exports.createProductCategorie = async (req, res, next) => {
  const { restaurantId } = req.params;
  const { name, subHeading, displayOrder } = req.body;

  try {
    const data = await prisma.categorie.create({
      data: {
        restaurantId,
        name,
        subHeading,
        displayOrder,
      },
    });
    logger.info({ responseId: data.id }, "Product categorie created");
    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.updateProductCategorie = async (req, res, next) => {
  const { restaurantId, categorieId } = req.params;
  const { name, subHeading, displayOrder } = req.body;

  try {
    const existing = await prisma.categorie.findUnique({ where: { id: categorieId } });
    if (!existing || existing.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Category not found" });
    }

    const data = await prisma.categorie.update({
      where: { id: categorieId },
      data: { name, subHeading, displayOrder },
    });
    logger.info({ responseId: data.id }, "Product categorie updated");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.deleteProductCategorie = async (req, res, next) => {
  const { restaurantId, categorieId } = req.params;

  try {
    const existing = await prisma.categorie.findUnique({ where: { id: categorieId } });
    if (!existing || existing.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Category not found" });
    }

    await prisma.categorie.delete({ where: { id: categorieId } });
    logger.info({ responseId: categorieId }, "Product categorie deleted");
    return res.status(200).json({ message: "Product categorie deleted" });
  } catch (error) {
    next(error);
  }
};

module.exports.createProduct = async (req, res, next) => {
  const { restaurantId } = req.params;
  const {
    name,
    description,
    imageUrl,
    price,
    tags,
    discount,
    isAvailable,
    displayOrder,
    categorieId,
  } = req.body;

  try {
    const data = await prisma.$transaction(async (tx) => {
      const product = await tx.product.create({
        data: {
          restaurantId,
          name,
          description,
          imageUrl,
          price,
          tags,
          discount,
          isAvailable,
          displayOrder,
        },
      });

      await tx.productCategorie.create({
        data: {
          productId: product.id,
          categorieId: categorieId,
        },
      });

      return product;
    });

    logger.info({ responseId: data.id }, "Product created");
    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.updateProduct = async (req, res, next) => {
  const { restaurantId, productId } = req.params;
  const {
    name,
    description,
    imageUrl,
    price,
    tags,
    discount,
    isAvailable,
    displayOrder,
    categorieId,
  } = req.body;

  try {
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing || existing.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Product not found" });
    }

    const data = await prisma.$transaction(async (tx) => {
      const product = await tx.product.update({
        where: {
          id: productId,
        },
        data: {
          name,
          description,
          imageUrl,
          price,
          tags,
          discount,
          isAvailable,
          displayOrder,
        },
      });

      const actualCategorie = await tx.productCategorie.findMany({
        where: {
          productId: productId,
        },
      });

      if (
        !categorieId ||
        actualCategorie.some(
          (categorie) => categorie.categorieId === categorieId,
        )
      ) {
        return product;
      }

      await tx.productCategorie.create({
        data: {
          productId: product.id,
          categorieId: categorieId,
        },
      });

      return product;
    });

    logger.info({ responseId: data.id }, "Product updated");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.deleteProduct = async (req, res, next) => {
  const { restaurantId, productId } = req.params;

  try {
    const existing = await prisma.product.findUnique({ where: { id: productId } });
    if (!existing || existing.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Product not found" });
    }

    await prisma.product.delete({ where: { id: productId } });
    logger.info({ responseId: productId }, "Product deleted");
    return res.status(200).json({ message: "Product deleted" });
  } catch (error) {
    next(error);
  }
};

// ─── OPTION GROUPS (restaurant-level) ───────────────────────

module.exports.listOptionGroups = async (req, res, next) => {
  const { restaurantId } = req.params;
  try {
    const data = await prisma.optionGroup.findMany({
      where: { restaurantId },
      orderBy: { displayOrder: "asc" },
      include: { optionChoices: { orderBy: { displayOrder: "asc" } } },
    });
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.createProductOptionGroup = async (req, res, next) => {
  const { restaurantId } = req.params;
  const { name, hasMultiple, isRequired, minQuantity, maxQuantity, displayOrder, choices } = req.body;

  try {
    const data = await prisma.$transaction(async (tx) => {
      const group = await tx.optionGroup.create({
        data: { restaurantId, name, hasMultiple, isRequired, minQuantity, maxQuantity, displayOrder },
      });
      if (choices && choices.length > 0) {
        await tx.optionChoice.createMany({
          data: choices.map((c) => ({
            optionGroupId: group.id,
            name: c.name,
            priceModifier: c.priceModifier ?? 0,
            displayOrder: c.displayOrder ?? 0,
          })),
        });
      }
      return tx.optionGroup.findUnique({
        where: { id: group.id },
        include: { optionChoices: { orderBy: { displayOrder: "asc" } } },
      });
    });
    logger.info({ responseId: data.id }, "Option group created");
    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.updateProductOptionGroup = async (req, res, next) => {
  const { restaurantId, optionGroupId } = req.params;
  const { name, hasMultiple, isRequired, minQuantity, maxQuantity, displayOrder } = req.body;

  try {
    const existing = await prisma.optionGroup.findUnique({ where: { id: optionGroupId } });
    if (!existing || existing.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Option group not found" });
    }

    const data = await prisma.optionGroup.update({
      where: { id: optionGroupId },
      data: { name, hasMultiple, isRequired, minQuantity, maxQuantity, displayOrder },
      include: { optionChoices: { orderBy: { displayOrder: "asc" } } },
    });
    logger.info({ responseId: data.id }, "Option group updated");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.deleteProductOptionGroup = async (req, res, next) => {
  const { restaurantId, optionGroupId } = req.params;

  try {
    const existing = await prisma.optionGroup.findUnique({ where: { id: optionGroupId } });
    if (!existing || existing.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Option group not found" });
    }

    await prisma.optionGroup.delete({ where: { id: optionGroupId } });
    logger.info({ optionGroupId }, "Option group deleted");
    return res.status(200).json({ message: "Option group deleted" });
  } catch (error) {
    next(error);
  }
};

// ─── LINK / UNLINK OPTION GROUPS TO PRODUCTS ────────────────

module.exports.linkOptionGroups = async (req, res, next) => {
  const { restaurantId, productId } = req.params;
  const { optionGroupIds } = req.body;

  try {
    const existing = await prisma.productOptionGroup.findMany({
      where: { productId },
      orderBy: { displayOrder: "asc" },
    });
    const nextOrder = existing.length > 0
      ? Math.max(...existing.map((e) => e.displayOrder)) + 1
      : 0;

    await prisma.productOptionGroup.createMany({
      data: optionGroupIds.map((id, i) => ({
        productId,
        optionGroupId: id,
        displayOrder: nextOrder + i,
      })),
      skipDuplicates: true,
    });
    logger.info({ productId, optionGroupIds }, "Option groups linked to product");
    return res.status(200).json({ message: "Option groups linked" });
  } catch (error) {
    next(error);
  }
};

module.exports.reorderProductOptionGroups = async (req, res, next) => {
  const { restaurantId, productId } = req.params;
  const { orderedIds } = req.body;

  try {
    await prisma.$transaction(
      orderedIds.map((id, i) =>
        prisma.productOptionGroup.update({
          where: { productId_optionGroupId: { productId, optionGroupId: id } },
          data: { displayOrder: i },
        })
      )
    );
    logger.info({ productId, orderedIds }, "Option groups reordered for product");
    return res.status(200).json({ message: "Option groups reordered" });
  } catch (error) {
    next(error);
  }
};

module.exports.unlinkOptionGroup = async (req, res, next) => {
  const { restaurantId, productId, optionGroupId } = req.params;

  try {
    await prisma.productOptionGroup.delete({
      where: { productId_optionGroupId: { productId, optionGroupId } },
    });
    logger.info({ productId, optionGroupId }, "Option group unlinked from product");
    return res.status(200).json({ message: "Option group unlinked" });
  } catch (error) {
    next(error);
  }
};

// ─── OPTION CHOICES ──────────────────────────────────────────

module.exports.createProductOptionChoice = async (req, res, next) => {
  const { restaurantId, optionGroupId } = req.params;
  const { name, priceModifier, displayOrder } = req.body;

  try {
    const data = await prisma.optionChoice.create({
      data: { optionGroupId, name, priceModifier, displayOrder },
    });
    logger.info({ responseId: data.id }, "Option choice created");
    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.createBulkOptionChoices = async (req, res, next) => {
  const { restaurantId, optionGroupId } = req.params;
  const choices = req.body;

  try {
    await prisma.optionChoice.createMany({
      data: choices.map((c) => ({
        optionGroupId,
        name: c.name,
        priceModifier: c.priceModifier ?? 0,
        displayOrder: c.displayOrder ?? 0,
      })),
    });
    const data = await prisma.optionChoice.findMany({
      where: { optionGroupId },
      orderBy: { displayOrder: "asc" },
    });
    logger.info({ optionGroupId, count: choices.length }, "Bulk option choices created");
    return res.status(201).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.updateProductOptionChoice = async (req, res, next) => {
  const { restaurantId, optionChoiceId } = req.params;
  const { name, priceModifier, displayOrder } = req.body;

  try {
    const existing = await prisma.optionChoice.findUnique({
      where: { id: optionChoiceId },
      include: { optionGroup: { select: { restaurantId: true } } },
    });
    if (!existing || existing.optionGroup.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Option choice not found" });
    }

    const data = await prisma.optionChoice.update({
      where: { id: optionChoiceId },
      data: { name, priceModifier, displayOrder },
    });
    logger.info({ responseId: data.id }, "Option choice updated");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.deleteProductOptionChoice = async (req, res, next) => {
  const { restaurantId, optionChoiceId } = req.params;

  try {
    const existing = await prisma.optionChoice.findUnique({
      where: { id: optionChoiceId },
      include: { optionGroup: { select: { restaurantId: true } } },
    });
    if (!existing || existing.optionGroup.restaurantId !== restaurantId) {
      return res.status(404).json({ error: "Option choice not found" });
    }

    await prisma.optionChoice.delete({ where: { id: optionChoiceId } });
    logger.info({ optionChoiceId }, "Option choice deleted");
    return res.status(200).json({ message: "Option choice deleted" });
  } catch (error) {
    next(error);
  }
};

function flattenOptionGroups(product) {
  const { productOptionGroups, ...rest } = product;
  return {
    ...rest,
    optionGroups: (productOptionGroups || [])
      .sort((a, b) => a.displayOrder - b.displayOrder)
      .map((pog) => pog.optionGroup),
  };
}

const PRODUCT_OPTION_INCLUDE = {
  productOptionGroups: {
    orderBy: { displayOrder: "asc" },
    include: {
      optionGroup: {
        include: { optionChoices: { orderBy: { displayOrder: "asc" } } },
      },
    },
  },
};

module.exports.searchProducts = async (req, res, next) => {
  const { restaurantId } = req.params;
  const { q, isAvailable } = req.query;

  const where = { restaurantId };
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { description: { contains: q, mode: "insensitive" } },
    ];
  }
  if (isAvailable !== undefined) {
    where.isAvailable = isAvailable === "true";
  }

  try {
    const products = await prisma.product.findMany({
      where,
      orderBy: { displayOrder: "asc" },
      include: PRODUCT_OPTION_INCLUDE,
    });

    logger.info({ restaurantId, q }, "Products searched");
    return res.status(200).json({ data: products.map(flattenOptionGroups) });
  } catch (error) {
    next(error);
  }
};

module.exports.getMenu = async (req, res, next) => {
  const { restaurantId } = req.params;

  try {
    const categories = await prisma.categorie.findMany({
      where: { restaurantId },
      orderBy: { displayOrder: "asc" },
      include: {
        productCategories: {
          include: {
            product: { include: PRODUCT_OPTION_INCLUDE },
          },
        },
      },
    });
    const data = categories.map((cat) => ({
      ...cat,
      productCategories: cat.productCategories.map((pc) => ({
        ...pc,
        product: flattenOptionGroups(pc.product),
      })),
    }));

    logger.info({ restaurantId }, "Menu retrieved");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};

module.exports.getProduct = async (req, res, next) => {
  const { productId } = req.params;

  try {
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        productCategories: { include: { categorie: true } },
        ...PRODUCT_OPTION_INCLUDE,
      },
    });

    if (!product) {
      return res.status(404).json({ error: "Product not found" });
    }

    const data = flattenOptionGroups(product);
    logger.info({ responseId: data.id }, "Product retrieved");
    return res.status(200).json({ data });
  } catch (error) {
    next(error);
  }
};
