const {
  createProductCategorie,
  updateProductCategorie,
  deleteProductCategorie,
  createProduct,
  updateProduct,
  deleteProduct,
  createProductOptionGroup,
  updateProductOptionGroup,
  deleteProductOptionGroup,
  createProductOptionChoice,
  updateProductOptionChoice,
  deleteProductOptionChoice,
  getMenu,
  getProduct,
} = require("../../controllers/menu.controllers");

const mockRes = () => {
  const res = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
};

describe("menu controllers", () => {
  let mockPrisma;

  beforeEach(() => {
    mockPrisma = globalThis.__mockPrisma;
    mockPrisma.$transaction = vi.fn();
    mockPrisma.categorie = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    };
    mockPrisma.product = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
    };
    mockPrisma.optionGroup = {
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    };
    mockPrisma.optionChoice = {
      create: vi.fn(),
      createMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
      findMany: vi.fn(),
    };
    mockPrisma.productOptionGroup = {
      createMany: vi.fn(),
      delete: vi.fn(),
    };
  });

  // ─── CATEGORIES ─────────────────────────────────────────────
  describe("createProductCategorie", () => {
    test("returns 201 with created categorie", async () => {
      const created = { id: "cat-1", name: "Entrées", displayOrder: 1 };
      mockPrisma.categorie.create.mockResolvedValue(created);

      const req = {
        params: { restaurantId: "rest-1" },
        body: { name: "Entrées", displayOrder: 1 },
      };
      const res = mockRes();
      const next = vi.fn();

      await createProductCategorie(req, res, next);

      expect(mockPrisma.categorie.create).toHaveBeenCalledWith({
        data: {
          restaurantId: "rest-1",
          name: "Entrées",
          subHeading: undefined,
          displayOrder: 1,
        },
      });
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: created });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.categorie.create.mockRejectedValue(err);

      const req = {
        params: { restaurantId: "rest-1" },
        body: { name: "Test", displayOrder: 1 },
      };
      const res = mockRes();
      const next = vi.fn();

      await createProductCategorie(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("updateProductCategorie", () => {
    test("returns 200 with updated categorie", async () => {
      const updated = { id: "cat-1", name: "Plats" };
      mockPrisma.categorie.update.mockResolvedValue(updated);

      const req = {
        params: { categorieId: "cat-1" },
        body: { name: "Plats" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateProductCategorie(req, res, next);

      expect(mockPrisma.categorie.update).toHaveBeenCalledWith({
        where: { id: "cat-1" },
        data: { name: "Plats", subHeading: undefined, displayOrder: undefined },
      });
      expect(res.status).toHaveBeenCalledWith(200);
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.categorie.update.mockRejectedValue(err);

      const req = { params: { categorieId: "cat-1" }, body: {} };
      const res = mockRes();
      const next = vi.fn();

      await updateProductCategorie(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("deleteProductCategorie", () => {
    test("returns 200 with success message", async () => {
      mockPrisma.categorie.delete.mockResolvedValue({ id: "cat-1" });

      const req = { params: { categorieId: "cat-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteProductCategorie(req, res, next);

      expect(mockPrisma.categorie.delete).toHaveBeenCalledWith({
        where: { id: "cat-1" },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        message: "Product categorie deleted",
      });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.categorie.delete.mockRejectedValue(err);

      const req = { params: { categorieId: "cat-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteProductCategorie(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ─── PRODUCTS ───────────────────────────────────────────────
  describe("createProduct", () => {
    test("returns 201 with created product", async () => {
      const created = { id: "prod-1", name: "Burger", price: 12 };
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          product: { create: vi.fn().mockResolvedValue(created) },
          productCategorie: { create: vi.fn().mockResolvedValue({}) },
        };
        return fn(tx);
      });

      const req = {
        params: { restaurantId: "rest-1" },
        body: {
          name: "Burger",
          description: "Good burger",
          imageUrl: "https://example.com/img.jpg",
          price: 12,
          categorieId: "cat-1",
        },
      };
      const res = mockRes();
      const next = vi.fn();

      await createProduct(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: created });
    });

    test("links product to categorie in transaction", async () => {
      const created = { id: "prod-1" };
      let categorieCreateArgs;

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          product: { create: vi.fn().mockResolvedValue(created) },
          productCategorie: {
            create: vi.fn().mockImplementation((args) => {
              categorieCreateArgs = args;
              return {};
            }),
          },
        };
        return fn(tx);
      });

      const req = {
        params: { restaurantId: "rest-1" },
        body: { name: "Burger", categorieId: "cat-1" },
      };
      const res = mockRes();
      const next = vi.fn();

      await createProduct(req, res, next);

      expect(categorieCreateArgs).toEqual({
        data: { productId: "prod-1", categorieId: "cat-1" },
      });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.$transaction.mockRejectedValue(err);

      const req = {
        params: { restaurantId: "rest-1" },
        body: { name: "Burger", categorieId: "cat-1" },
      };
      const res = mockRes();
      const next = vi.fn();

      await createProduct(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("updateProduct", () => {
    test("returns 200 with updated product (no categorie change)", async () => {
      const updated = { id: "prod-1", name: "New Burger" };
      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          product: { update: vi.fn().mockResolvedValue(updated) },
          productCategorie: {
            findMany: vi.fn().mockResolvedValue([{ categorieId: "cat-1" }]),
            create: vi.fn(),
          },
        };
        return fn(tx);
      });

      const req = {
        params: { productId: "prod-1" },
        body: { name: "New Burger" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateProduct(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: updated });
    });

    test("creates new categorie link when categorieId changes", async () => {
      const updated = { id: "prod-1" };
      let categorieCreated = false;

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          product: { update: vi.fn().mockResolvedValue(updated) },
          productCategorie: {
            findMany: vi.fn().mockResolvedValue([{ categorieId: "cat-old" }]),
            create: vi.fn().mockImplementation(() => {
              categorieCreated = true;
              return {};
            }),
          },
        };
        return fn(tx);
      });

      const req = {
        params: { productId: "prod-1" },
        body: { categorieId: "cat-new" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateProduct(req, res, next);

      expect(categorieCreated).toBe(true);
    });

    test("does not create categorie link when categorieId already exists", async () => {
      const updated = { id: "prod-1" };
      let categorieCreated = false;

      mockPrisma.$transaction.mockImplementation(async (fn) => {
        const tx = {
          product: { update: vi.fn().mockResolvedValue(updated) },
          productCategorie: {
            findMany: vi.fn().mockResolvedValue([{ categorieId: "cat-1" }]),
            create: vi.fn().mockImplementation(() => {
              categorieCreated = true;
              return {};
            }),
          },
        };
        return fn(tx);
      });

      const req = {
        params: { productId: "prod-1" },
        body: { categorieId: "cat-1" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateProduct(req, res, next);

      expect(categorieCreated).toBe(false);
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.$transaction.mockRejectedValue(err);

      const req = {
        params: { productId: "prod-1" },
        body: { name: "Test" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateProduct(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("deleteProduct", () => {
    test("returns 200 with success message", async () => {
      mockPrisma.product.delete.mockResolvedValue({ id: "prod-1" });

      const req = { params: { productId: "prod-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteProduct(req, res, next);

      expect(mockPrisma.product.delete).toHaveBeenCalledWith({
        where: { id: "prod-1" },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Product deleted" });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.product.delete.mockRejectedValue(err);

      const req = { params: { productId: "prod-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteProduct(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ─── OPTION GROUPS ──────────────────────────────────────────
  describe("createProductOptionGroup", () => {
    test("returns 201 with created option group", async () => {
      const created = { id: "og-1", name: "Sauces", optionChoices: [] };
      mockPrisma.$transaction.mockImplementation((fn) => fn(mockPrisma));
      mockPrisma.optionGroup.create.mockResolvedValue({ id: "og-1" });
      mockPrisma.optionGroup.findUnique.mockResolvedValue(created);

      const req = {
        params: { restaurantId: "rest-1" },
        body: { name: "Sauces", minQuantity: 1, maxQuantity: 1 },
      };
      const res = mockRes();
      const next = vi.fn();

      await createProductOptionGroup(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: created });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.$transaction.mockRejectedValue(err);

      const req = {
        params: { restaurantId: "rest-1" },
        body: { name: "Sauces", minQuantity: 1, maxQuantity: 1 },
      };
      const res = mockRes();
      const next = vi.fn();

      await createProductOptionGroup(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("updateProductOptionGroup", () => {
    test("returns 200 with updated option group", async () => {
      const updated = { id: "og-1", name: "Toppings", optionChoices: [] };
      mockPrisma.optionGroup.update.mockResolvedValue(updated);

      const req = {
        params: { restaurantId: "rest-1", optionGroupId: "og-1" },
        body: { name: "Toppings" },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateProductOptionGroup(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: updated });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.optionGroup.update.mockRejectedValue(err);

      const req = { params: { restaurantId: "rest-1", optionGroupId: "og-1" }, body: {} };
      const res = mockRes();
      const next = vi.fn();

      await updateProductOptionGroup(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("deleteProductOptionGroup", () => {
    test("returns 200 with success message", async () => {
      mockPrisma.optionGroup.delete.mockResolvedValue({ id: "og-1" });

      const req = { params: { restaurantId: "rest-1", optionGroupId: "og-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteProductOptionGroup(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Option group deleted" });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.optionGroup.delete.mockRejectedValue(err);

      const req = { params: { restaurantId: "rest-1", optionGroupId: "og-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteProductOptionGroup(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ─── OPTION CHOICES ─────────────────────────────────────────
  describe("createProductOptionChoice", () => {
    test("returns 201 with created option choice", async () => {
      const created = { id: "oc-1", name: "Ketchup", priceModifier: 0, displayOrder: 0 };
      mockPrisma.optionChoice.create.mockResolvedValue(created);

      const req = {
        params: { restaurantId: "rest-1", optionGroupId: "og-1" },
        body: { name: "Ketchup", priceModifier: 0 },
      };
      const res = mockRes();
      const next = vi.fn();

      await createProductOptionChoice(req, res, next);

      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({ data: created });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.optionChoice.create.mockRejectedValue(err);

      const req = {
        params: { restaurantId: "rest-1", optionGroupId: "og-1" },
        body: { name: "Ketchup" },
      };
      const res = mockRes();
      const next = vi.fn();

      await createProductOptionChoice(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("updateProductOptionChoice", () => {
    test("returns 200 with updated option choice", async () => {
      const updated = { id: "oc-1", name: "Mayo", priceModifier: 0.5 };
      mockPrisma.optionChoice.update.mockResolvedValue(updated);

      const req = {
        params: { restaurantId: "rest-1", optionChoiceId: "oc-1" },
        body: { name: "Mayo", priceModifier: 0.5 },
      };
      const res = mockRes();
      const next = vi.fn();

      await updateProductOptionChoice(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: updated });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.optionChoice.update.mockRejectedValue(err);

      const req = { params: { restaurantId: "rest-1", optionChoiceId: "oc-1" }, body: {} };
      const res = mockRes();
      const next = vi.fn();

      await updateProductOptionChoice(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  describe("deleteProductOptionChoice", () => {
    test("returns 200 with success message", async () => {
      mockPrisma.optionChoice.delete.mockResolvedValue({ id: "oc-1" });

      const req = { params: { restaurantId: "rest-1", optionChoiceId: "oc-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteProductOptionChoice(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: "Option choice deleted" });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.optionChoice.delete.mockRejectedValue(err);

      const req = { params: { restaurantId: "rest-1", optionChoiceId: "oc-1" } };
      const res = mockRes();
      const next = vi.fn();

      await deleteProductOptionChoice(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ─── GET MENU ───────────────────────────────────────────────
  describe("getMenu", () => {
    test("returns 200 with menu categories", async () => {
      const rawCategories = [
        {
          id: "cat-1",
          name: "Entrées",
          productCategories: [
            {
              product: {
                id: "prod-1",
                name: "Salade",
                productOptionGroups: [],
              },
            },
          ],
        },
      ];
      const expectedCategories = [
        {
          id: "cat-1",
          name: "Entrées",
          productCategories: [
            {
              product: {
                id: "prod-1",
                name: "Salade",
                optionGroups: [],
              },
            },
          ],
        },
      ];
      mockPrisma.categorie.findMany.mockResolvedValue(rawCategories);

      const req = { params: { restaurantId: "rest-1" }, query: {} };
      const res = mockRes();
      const next = vi.fn();

      await getMenu(req, res, next);

      expect(mockPrisma.categorie.findMany).toHaveBeenCalledWith({
        where: { restaurantId: "rest-1" },
        orderBy: { displayOrder: "asc" },
        include: {
          productCategories: {
            include: {
              product: {
                include: {
                  productOptionGroups: {
                    include: {
                      optionGroup: {
                        include: { optionChoices: { orderBy: { displayOrder: "asc" } } },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      });
      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: expectedCategories });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.categorie.findMany.mockRejectedValue(err);

      const req = { params: { restaurantId: "rest-1" }, query: { } };
      const res = mockRes();
      const next = vi.fn();

      await getMenu(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });

  // ─── GET PRODUCT ────────────────────────────────────────────
  describe("getProduct", () => {
    test("returns 200 with product data", async () => {
      const rawProduct = {
        id: "prod-1",
        name: "Burger",
        productCategories: [],
        productOptionGroups: [],
      };
      const expectedProduct = {
        id: "prod-1",
        name: "Burger",
        productCategories: [],
        optionGroups: [],
      };
      mockPrisma.product.findUnique.mockResolvedValue(rawProduct);

      const req = { params: { productId: "prod-1" }, query: {} };
      const res = mockRes();
      const next = vi.fn();

      await getProduct(req, res, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ data: expectedProduct });
    });

    test("returns 404 when product not found", async () => {
      mockPrisma.product.findUnique.mockResolvedValue(null);

      const req = { params: { productId: "prod-999" } };
      const res = mockRes();
      const next = vi.fn();

      await getProduct(req, res, next);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({ error: "Product not found" });
    });

    test("calls next on error", async () => {
      const err = new Error("fail");
      mockPrisma.product.findUnique.mockRejectedValue(err);

      const req = { params: { productId: "prod-1" } };
      const res = mockRes();
      const next = vi.fn();

      await getProduct(req, res, next);

      expect(next).toHaveBeenCalledWith(err);
    });
  });
});
