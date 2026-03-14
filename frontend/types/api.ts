// API v2 Types

export type OptionChoice = {
  id: string;
  optionGroupId: string;
  name: string;
  priceModifier: string; // Decimal as string — use parseFloat()
  displayOrder: number;
};

export type OptionGroup = {
  id: string;
  restaurantId: string;
  name: string;
  hasMultiple: boolean;
  isRequired: boolean;
  minQuantity: number;
  maxQuantity: number;
  displayOrder: number;
  optionChoices: OptionChoice[];
};

export type Product = {
  id: string;
  restaurantId: string;
  name: string;
  description: string;
  imageUrl: string;
  price: string; // Decimal as string — use parseFloat()
  tags: string[];
  discount: string;
  isAvailable: boolean;
  displayOrder: number;
  optionGroups: OptionGroup[];
};

export type ProductCategory = {
  id: string;
  productId: string;
  categorieId: string;
  product: Product;
};

export type Category = {
  id: string;
  restaurantId: string;
  name: string;
  subHeading: string | null;
  displayOrder: number;
  createdAt: string;
  updatedAt: string;
  productCategories: ProductCategory[];
};

export type Restaurant = {
  id: string;
  name: string;
  slug: string | null;
  address: string;
  zipCode: string;
  city: string;
  phone: string;
  email: string | null;
  imageUrl: string | null;
  stripeAccountId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type OrderProductOption = {
  id: string;
  orderProductId: string;
  optionChoiceId: string;
  optionChoice: OptionChoice;
};

export type OrderProduct = {
  id: string;
  orderId: string;
  productId: string;
  quantity: number;
  product: Product;
  orderProductOptions: OrderProductOption[];
};

export type OrderStatus =
  | "PENDING"
  | "PENDING_ON_SITE_PAYMENT"
  | "IN_PROGRESS"
  | "COMPLETED"
  | "DELIVERED"
  | "CANCELLED";

export type Order = {
  id: string;
  restaurantId: string;
  fullName: string | null;
  phone: string | null;
  email: string | null;
  status: OrderStatus;
  totalPrice: string;
  stripePaymentIntentId: string | null;
  scheduledFor: string | null;
  createdAt: string;
  updatedAt: string;
  orderProducts: OrderProduct[];
};

export type Pagination = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: Pagination;
};

export type OpeningHour = {
  id: string;
  restaurantId: string;
  dayOfWeek: number; // 0=Sunday, 1=Monday...6=Saturday
  openTime: string; // "HH:MM"
  closeTime: string; // "HH:MM"
  order: number;
};

export type RestaurantMember = {
  id: string;
  restaurantId: string;
  userId: string;
  role: "OWNER" | "ADMIN" | "STAFF";
  createdAt: string;
  updatedAt: string;
  user: {
    id: string;
    email: string;
    fullName: string | null;
    phone: string | null;
  };
};

export type User = {
  id: string;
  email: string;
  fullName: string | null;
  phone: string | null;
  createdAt: string;
  updatedAt: string;
  restaurantMembers: RestaurantMember[];
};

export type PromoCode = {
  id: string;
  restaurantId: string;
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: string;
  minOrderAmount: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  isActive: boolean;
  createdAt: string;
};

export type Stats = {
  period: "day" | "week" | "month";
  since: string;
  totalOrders: number;
  revenue: number;
  popularProducts: { name: string; count: number }[];
};

// Cart types (frontend only)
export type CartItem = {
  id: string; // unique identifier for this cart entry
  productId: string;
  name: string;
  imageUrl: string;
  basePrice: number;
  selectedOptions: {
    optionGroupId: string;
    optionGroupName: string;
    choices: { id: string; name: string; priceModifier: number }[];
  }[];
  quantity: number;
};

export type CheckoutItem = {
  productId: string;
  quantity: number;
  optionChoiceIds: string[];
};
