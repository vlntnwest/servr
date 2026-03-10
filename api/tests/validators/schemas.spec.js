const {
  updateUserSchema,
  restaurantSchema,
  categorieSchema,
  updateCategorieSchema,
  productSchema,
  updateProductSchema,
  productOptionGroupSchema,
  updateProductOptionGroupSchema,
  productOptionChoiceSchema,
  updateProductOptionChoiceSchema,
} = require("../../validators/schemas");

// ─── UPDATE USER SCHEMA ──────────────────────────────────────
describe("updateUserSchema", () => {
  test("accepts valid fullName and phone", () => {
    const result = updateUserSchema.safeParse({
      fullName: "Jean Dupont",
      phone: "06 12 34 56 78",
    });
    expect(result.success).toBe(true);
  });

  test("accepts only fullName", () => {
    const result = updateUserSchema.safeParse({ fullName: "Jean" });
    expect(result.success).toBe(true);
  });

  test("accepts only phone", () => {
    const result = updateUserSchema.safeParse({ phone: "06 12 34 56 78" });
    expect(result.success).toBe(true);
  });

  test("accepts empty object (all fields optional)", () => {
    const result = updateUserSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test("rejects fullName exceeding 50 chars", () => {
    const result = updateUserSchema.safeParse({ fullName: "a".repeat(51) });
    expect(result.success).toBe(false);
  });

  test("rejects empty fullName", () => {
    const result = updateUserSchema.safeParse({ fullName: "" });
    expect(result.success).toBe(false);
  });

  test("rejects invalid phone number", () => {
    const result = updateUserSchema.safeParse({ phone: "invalid" });
    expect(result.success).toBe(false);
  });

  test("rejects non-French phone number", () => {
    const result = updateUserSchema.safeParse({ phone: "+1 555 123 4567" });
    expect(result.success).toBe(false);
  });

  test("accepts phone with +33 prefix", () => {
    const result = updateUserSchema.safeParse({ phone: "+33 6 12 34 56 78" });
    expect(result.success).toBe(true);
  });
});

// ─── RESTAURANT SCHEMA ───────────────────────────────────────
describe("restaurantSchema", () => {
  const validRestaurant = {
    name: "Le Bon Resto",
    address: "123 Rue de Paris",
    zipCode: "75001",
    city: "Paris",
    phone: "06 12 34 56 78",
  };

  test("accepts valid restaurant with required fields only", () => {
    const result = restaurantSchema.safeParse(validRestaurant);
    expect(result.success).toBe(true);
  });

  test("accepts valid restaurant with all fields", () => {
    const result = restaurantSchema.safeParse({
      ...validRestaurant,
      email: "resto@test.com",
      imageUrl: "https://example.com/image.jpg",
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing name", () => {
    const { name, ...rest } = validRestaurant;
    const result = restaurantSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects missing address", () => {
    const { address, ...rest } = validRestaurant;
    const result = restaurantSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects missing zipCode", () => {
    const { zipCode, ...rest } = validRestaurant;
    const result = restaurantSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects invalid zipCode (not 5 digits)", () => {
    const result = restaurantSchema.safeParse({
      ...validRestaurant,
      zipCode: "123",
    });
    expect(result.success).toBe(false);
  });

  test("rejects zipCode with letters", () => {
    const result = restaurantSchema.safeParse({
      ...validRestaurant,
      zipCode: "7500A",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing city", () => {
    const { city, ...rest } = validRestaurant;
    const result = restaurantSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects missing phone", () => {
    const { phone, ...rest } = validRestaurant;
    const result = restaurantSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects invalid phone", () => {
    const result = restaurantSchema.safeParse({
      ...validRestaurant,
      phone: "not-a-phone",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid email", () => {
    const result = restaurantSchema.safeParse({
      ...validRestaurant,
      email: "not-an-email",
    });
    expect(result.success).toBe(false);
  });

  test("rejects invalid imageUrl", () => {
    const result = restaurantSchema.safeParse({
      ...validRestaurant,
      imageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("rejects name exceeding 50 chars", () => {
    const result = restaurantSchema.safeParse({
      ...validRestaurant,
      name: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

// ─── CATEGORIE SCHEMA ────────────────────────────────────────
describe("categorieSchema", () => {
  test("accepts valid categorie", () => {
    const result = categorieSchema.safeParse({
      name: "Entrées",
      displayOrder: 1,
    });
    expect(result.success).toBe(true);
  });

  test("accepts with optional subHeading", () => {
    const result = categorieSchema.safeParse({
      name: "Entrées",
      subHeading: "Nos entrées maison",
      displayOrder: 1,
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing name", () => {
    const result = categorieSchema.safeParse({ displayOrder: 1 });
    expect(result.success).toBe(false);
  });

  test("rejects missing displayOrder", () => {
    const result = categorieSchema.safeParse({ name: "Entrées" });
    expect(result.success).toBe(false);
  });

  test("rejects name exceeding 50 chars", () => {
    const result = categorieSchema.safeParse({
      name: "a".repeat(51),
      displayOrder: 1,
    });
    expect(result.success).toBe(false);
  });
});

// ─── UPDATE CATEGORIE SCHEMA ─────────────────────────────────
describe("updateCategorieSchema", () => {
  test("accepts partial update with name only", () => {
    const result = updateCategorieSchema.safeParse({ name: "Plats" });
    expect(result.success).toBe(true);
  });

  test("accepts partial update with displayOrder only", () => {
    const result = updateCategorieSchema.safeParse({ displayOrder: 2 });
    expect(result.success).toBe(true);
  });

  test("accepts empty object", () => {
    const result = updateCategorieSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test("rejects name exceeding 50 chars", () => {
    const result = updateCategorieSchema.safeParse({ name: "a".repeat(51) });
    expect(result.success).toBe(false);
  });
});

// ─── PRODUCT SCHEMA ──────────────────────────────────────────
describe("productSchema", () => {
  const validProduct = {
    name: "Burger",
    description: "Un bon burger",
    imageUrl: "https://example.com/burger.jpg",
    price: 12.5,
    categorieId: "550e8400-e29b-41d4-a716-446655440000",
  };

  test("accepts valid product with required fields", () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.success).toBe(true);
  });

  test("applies default values for optional fields", () => {
    const result = productSchema.safeParse(validProduct);
    expect(result.data.discount).toBe(0);
    expect(result.data.isAvailable).toBe(true);
    expect(result.data.displayOrder).toBe(999);
  });

  test("accepts product with all fields", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      tags: ["bio", "vegan"],
      discount: 10,
      isAvailable: false,
      displayOrder: 1,
    });
    expect(result.success).toBe(true);
  });

  test("rejects missing name", () => {
    const { name, ...rest } = validProduct;
    const result = productSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects missing description", () => {
    const { description, ...rest } = validProduct;
    const result = productSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects missing imageUrl", () => {
    const { imageUrl, ...rest } = validProduct;
    const result = productSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects invalid imageUrl", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      imageUrl: "not-a-url",
    });
    expect(result.success).toBe(false);
  });

  test("rejects missing price", () => {
    const { price, ...rest } = validProduct;
    const result = productSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects missing categorieId", () => {
    const { categorieId, ...rest } = validProduct;
    const result = productSchema.safeParse(rest);
    expect(result.success).toBe(false);
  });

  test("rejects non-uuid categorieId", () => {
    const result = productSchema.safeParse({
      ...validProduct,
      categorieId: "not-a-uuid",
    });
    expect(result.success).toBe(false);
  });
});

// ─── UPDATE PRODUCT SCHEMA ───────────────────────────────────
describe("updateProductSchema", () => {
  test("accepts partial update", () => {
    const result = updateProductSchema.safeParse({ name: "New Burger" });
    expect(result.success).toBe(true);
  });

  test("accepts empty object", () => {
    const result = updateProductSchema.safeParse({});
    expect(result.success).toBe(true);
  });

  test("rejects invalid imageUrl", () => {
    const result = updateProductSchema.safeParse({ imageUrl: "bad" });
    expect(result.success).toBe(false);
  });

  test("rejects non-uuid categorieId", () => {
    const result = updateProductSchema.safeParse({ categorieId: "bad" });
    expect(result.success).toBe(false);
  });
});

// ─── PRODUCT OPTION GROUP SCHEMA ─────────────────────────────
describe("productOptionGroupSchema", () => {
  test("accepts valid option group with name only", () => {
    const result = productOptionGroupSchema.safeParse({ name: "Sauces" });
    expect(result.success).toBe(true);
  });

  test("applies default values", () => {
    const result = productOptionGroupSchema.safeParse({ name: "Sauces" });
    expect(result.data.hasMultiple).toBe(false);
    expect(result.data.isRequired).toBe(false);
    expect(result.data.minQuantity).toBe(1);
    expect(result.data.maxQuantity).toBe(1);
  });

  test("rejects missing name", () => {
    const result = productOptionGroupSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  test("rejects name exceeding 50 chars", () => {
    const result = productOptionGroupSchema.safeParse({
      name: "a".repeat(51),
    });
    expect(result.success).toBe(false);
  });
});

// ─── UPDATE PRODUCT OPTION GROUP SCHEMA ──────────────────────
describe("updateProductOptionGroupSchema", () => {
  test("accepts partial update", () => {
    const result = updateProductOptionGroupSchema.safeParse({
      hasMultiple: true,
    });
    expect(result.success).toBe(true);
  });

  test("accepts empty object", () => {
    const result = updateProductOptionGroupSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});

// ─── PRODUCT OPTION CHOICE SCHEMA ────────────────────────────
describe("productOptionChoiceSchema", () => {
  test("accepts valid option choice", () => {
    const result = productOptionChoiceSchema.safeParse({ name: "Ketchup" });
    expect(result.success).toBe(true);
  });

  test("applies default priceModifier", () => {
    const result = productOptionChoiceSchema.safeParse({ name: "Ketchup" });
    expect(result.data.priceModifier).toBe(0);
  });

  test("accepts with priceModifier", () => {
    const result = productOptionChoiceSchema.safeParse({
      name: "Cheddar",
      priceModifier: 1.5,
    });
    expect(result.success).toBe(true);
    expect(result.data.priceModifier).toBe(1.5);
  });

  test("rejects missing name", () => {
    const result = productOptionChoiceSchema.safeParse({});
    expect(result.success).toBe(false);
  });
});

// ─── UPDATE PRODUCT OPTION CHOICE SCHEMA ─────────────────────
describe("updateProductOptionChoiceSchema", () => {
  test("accepts partial update", () => {
    const result = updateProductOptionChoiceSchema.safeParse({
      priceModifier: 2,
    });
    expect(result.success).toBe(true);
  });

  test("accepts empty object", () => {
    const result = updateProductOptionChoiceSchema.safeParse({});
    expect(result.success).toBe(true);
  });
});
