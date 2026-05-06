const { z } = require("zod");

// Common schemas
const phoneSchema = z
  .string()
  .regex(
    /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/,
    "Invalid French phone number",
  );

// User schemas
const updateUserSchema = z.object({
  fullName: z.string().min(1).max(50).optional(),
  phone: phoneSchema.optional(),
  address: z.string().max(200).optional(),
  city: z.string().max(50).optional(),
  zipCode: z.string().regex(/^[0-9]{5}$/, "Invalid French postal code").optional(),
});

const getUserOrdersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
  offset: z.coerce.number().int().min(0).default(0),
});

const restaurantSchema = z.object({
  name: z.string().min(1).max(50),
  slug: z
    .string()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase alphanumeric with hyphens")
    .optional(),
  address: z.string().min(1).max(255),
  zipCode: z
    .string()
    .min(1)
    .max(5)
    .regex(/^[0-9]{5}$/),
  city: z.string().min(1).max(50),
  phone: phoneSchema,
  email: z.string().email().optional(),
  imageUrl: z.string().url().nullable().optional(),
});

const categorieSchema = z.object({
  name: z.string().min(1).max(50),
  subHeading: z.string().min(1).max(255).optional(),
  displayOrder: z.number(),
});

const updateCategorieSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  subHeading: z.string().min(1).max(255).optional(),
  displayOrder: z.number().optional(),
});

const productSchema = z.object({
  name: z.string().min(1).max(50),
  description: z.string().min(1).max(255),
  imageUrl: z.string().url(),
  price: z.number(),
  tags: z.array(z.string()).optional(),
  discount: z.number().default(0),
  isAvailable: z.boolean().default(true),
  displayOrder: z.number().default(999),
  categorieId: z.string().uuid(),
});

const updateProductSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  description: z.string().min(1).max(255).optional(),
  imageUrl: z.string().url().optional(),
  price: z.number().optional(),
  tags: z.array(z.string()).optional(),
  discount: z.number().optional(),
  isAvailable: z.boolean().optional(),
  displayOrder: z.number().optional(),
  categorieId: z.string().uuid().optional(),
});

const optionChoiceInputSchema = z.object({
  name: z.string().min(1).max(50),
  priceModifier: z.number().default(0),
  displayOrder: z.number().int().default(0),
});

const productOptionGroupSchema = z.object({
  name: z.string().min(1).max(50),
  hasMultiple: z.boolean().default(false),
  isRequired: z.boolean().default(false),
  minQuantity: z.number().default(1),
  maxQuantity: z.number().default(1),
  displayOrder: z.number().int().default(0),
  choices: z.array(optionChoiceInputSchema).optional(),
});

const updateProductOptionGroupSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  hasMultiple: z.boolean().optional(),
  isRequired: z.boolean().optional(),
  minQuantity: z.number().optional(),
  maxQuantity: z.number().optional(),
  displayOrder: z.number().int().optional(),
});

const productOptionChoiceSchema = optionChoiceInputSchema;

const bulkOptionChoicesSchema = z.array(optionChoiceInputSchema).min(1);

const updateProductOptionChoiceSchema = z.object({
  name: z.string().min(1).max(50).optional(),
  priceModifier: z.number().optional(),
  displayOrder: z.number().int().optional(),
});

const linkOptionGroupsSchema = z.object({
  optionGroupIds: z.array(z.string().uuid()).min(1),
});

const reorderOptionGroupsSchema = z.object({
  orderedIds: z.array(z.string().uuid()).min(1),
});

// Order schemas
const orderItemSchema = z.object({
  productId: z.string().uuid(),
  quantity: z.number().int().min(1),
  optionChoiceIds: z.array(z.string().uuid()).optional().default([]),
});

const orderSchema = z.object({
  fullName: z.string().min(1).max(50).optional(),
  phone: phoneSchema.optional(),
  email: z.string().email().optional(),
  items: z.array(orderItemSchema).min(1),
  promoCode: z.string().min(1).max(50).optional(),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
});

const updateOrderStatusSchema = z.object({
  status: z.enum([
    "PENDING",
    "IN_PROGRESS",
    "COMPLETED",
    "DELIVERED",
    "CANCELLED",
    "PENDING_ON_SITE_PAYMENT",
  ]),
});

// Opening hours schemas
const openingHourItemSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM"),
  order: z.number().int().min(0),
});

const openingHoursSchema = z.array(openingHourItemSchema);

// Promo code schemas
const promoCodeSchema = z.object({
  code: z.string().min(1).max(50),
  discountType: z.enum(["PERCENTAGE", "FIXED"]),
  discountValue: z.number().positive(),
  minOrderAmount: z.number().positive().optional(),
  maxUses: z.number().int().positive().optional(),
  expiresAt: z.string().datetime().optional(),
  isActive: z.boolean().default(true),
});

const validatePromoCodeSchema = z.object({
  code: z.string().min(1),
  orderTotal: z.number().positive(),
});

// Preparation level schema
const updatePreparationLevelSchema = z.object({
  preparationLevel: z.enum(["EASY", "MEDIUM", "BUSY", "CLOSED"]),
});

// Exceptional hours schemas
const exceptionalHourSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be YYYY-MM-DD"),
  isClosed: z.boolean().default(true),
  openTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM").optional(),
  closeTime: z.string().regex(/^\d{2}:\d{2}$/, "Time must be HH:MM").optional(),
  label: z.string().max(100).optional(),
});

// Checkout schemas
const checkoutSessionSchema = z.object({
  restaurantId: z.string().uuid(),
  fullName: z.string().min(1).max(50).optional(),
  phone: phoneSchema.optional(),
  email: z.string().email().optional(),
  items: z.array(orderItemSchema).min(1),
  scheduledFor: z.string().datetime({ offset: true }).optional(),
});

const pushTokenSchema = z.object({
  token: z.string().min(1),
});

module.exports = {
  // User
  updateUserSchema,
  getUserOrdersQuerySchema,
  pushTokenSchema,

  // Restaurant
  restaurantSchema,

  // Menu
  categorieSchema,
  updateCategorieSchema,
  productSchema,
  updateProductSchema,
  productOptionGroupSchema,
  updateProductOptionGroupSchema,
  productOptionChoiceSchema,
  bulkOptionChoicesSchema,
  updateProductOptionChoiceSchema,
  linkOptionGroupsSchema,
  reorderOptionGroupsSchema,

  // Orders
  orderSchema,
  updateOrderStatusSchema,

  // Opening hours
  openingHoursSchema,

  // Preparation level
  updatePreparationLevelSchema,

  // Exceptional hours
  exceptionalHourSchema,

  // Checkout
  checkoutSessionSchema,

  // Promo codes
  promoCodeSchema,
  validatePromoCodeSchema,
};
