import { createClient } from "@/lib/supabase/client";
import type {
  Category,
  Product,
  Restaurant,
  Order,
  PaginatedResponse,
  OpeningHour,
  ExceptionalHour,
  RestaurantMember,
  PromoCode,
  Stats,
  OptionGroup,
  OptionChoice,
  CheckoutItem,
} from "@/types/api";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "";
let RESTAURANT_ID = "";
export function setRestaurantId(id: string) {
  RESTAURANT_ID = id;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const supabase = createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T } | { error: string }> {
  const authHeaders = await getAuthHeader();
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...authHeaders,
      ...(options.headers as Record<string, string>),
    },
  });
  return res.json();
}

// ── Public endpoints ─────────────────────────────────────────────────────────


export async function getRestaurant(): Promise<Restaurant | null> {
  const res = await fetch(`${API_URL}/api/v1/restaurants/${RESTAURANT_ID}`, {
    next: { revalidate: 3600 },
  });
  const json = await res.json();
  return json.data ?? null;
}

export async function getRestaurantBySlug(slug: string): Promise<Restaurant | null> {
  const res = await fetch(`${API_URL}/api/v1/restaurants/by-slug/${slug}`, {
    next: { revalidate: 3600 },
  });
  if (!res.ok) return null;
  const json = await res.json();
  return json.data ?? null;
}

export async function getMenuForRestaurant(restaurantId: string): Promise<Category[]> {
  const res = await fetch(
    `${API_URL}/api/v1/menu/restaurants/${restaurantId}/menu`,
    { next: { revalidate: 60 } },
  );
  const json = await res.json();
  return json.data ?? [];
}

export async function getOpeningHours(restaurantId?: string): Promise<OpeningHour[]> {
  const rid = restaurantId ?? RESTAURANT_ID;
  const res = await fetch(
    `${API_URL}/api/v1/restaurants/${rid}/opening-hours`,
    { next: { revalidate: 3600 } },
  );
  const json = await res.json();
  return json.data ?? [];
}

export async function validatePromoCode(
  code: string,
  orderTotal: number,
): Promise<{
  data?: { code: string; discountAmount: number; finalTotal: number };
  error?: string;
}> {
  const res = await fetch(
    `${API_URL}/api/v1/restaurants/${RESTAURANT_ID}/promo-codes/validate`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, orderTotal }),
    },
  );
  return res.json();
}

// ── Checkout ─────────────────────────────────────────────────────────────────

export async function createCheckoutSession(
  payload: {
    fullName?: string;
    phone?: string;
    email?: string;
    items: CheckoutItem[];
    scheduledFor?: string;
  },
  restaurantId?: string,
): Promise<
  | { data: { url: string; sessionId: string } }
  | { data: { order: Order; paymentMethod: "on_site" } }
  | { error: string }
> {
  const rid = restaurantId ?? RESTAURANT_ID;
  const res = await fetch(`${API_URL}/api/v1/checkout/create-session`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ restaurantId: rid, ...payload }),
  });
  return res.json();
}

export async function createOrder(payload: {
  fullName?: string;
  phone?: string;
  email?: string;
  items: CheckoutItem[];
  promoCode?: string;
  scheduledFor?: string;
}): Promise<{ data?: Order; error?: string }> {
  const res = await fetch(
    `${API_URL}/api/v1/restaurants/${RESTAURANT_ID}/orders`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    },
  );
  return res.json();
}

// ── Auth-protected (STAFF+) ──────────────────────────────────────────────────

export async function getOrders(
  page = 1,
  limit = 20,
  status?: string,
): Promise<PaginatedResponse<Order>> {
  const params = new URLSearchParams({ page: String(page), limit: String(limit) });
  if (status) params.set("status", status);
  const result = await apiFetch<never>(
    `/restaurants/${RESTAURANT_ID}/orders?${params}`,
  );
  if ("error" in result) return { data: [], pagination: { page, limit, total: 0, totalPages: 0 } };
  return result as unknown as PaginatedResponse<Order>;
}

export async function updateOrderStatus(
  orderId: string,
  status: string,
): Promise<Order | null> {
  const result = await apiFetch<Order>(
    `/restaurants/${RESTAURANT_ID}/orders/${orderId}/status`,
    { method: "PATCH", body: JSON.stringify({ status }) },
  );
  if ("data" in result) return result.data;
  return null;
}

// ── Auth-protected (ADMIN+) ──────────────────────────────────────────────────

export async function getStats(
  period: "day" | "week" | "month" = "month",
): Promise<Stats | null> {
  const result = await apiFetch<Stats>(
    `/restaurants/${RESTAURANT_ID}/stats?period=${period}`,
  );
  if ("data" in result) return result.data;
  return null;
}

export async function getOptionGroups(): Promise<OptionGroup[]> {
  const result = await apiFetch<OptionGroup[]>(
    `/menu/restaurants/${RESTAURANT_ID}/option-groups`,
  );
  if ("data" in result) return result.data;
  return [];
}

export async function getMembers(): Promise<
  PaginatedResponse<RestaurantMember>
> {
  const result = await apiFetch<never>(
    `/restaurants/${RESTAURANT_ID}/members`,
  );
  if ("error" in result) return { data: [], pagination: { page: 1, limit: 20, total: 0, totalPages: 0 } };
  return result as unknown as PaginatedResponse<RestaurantMember>;
}

export async function inviteMember(
  email: string,
  role: "ADMIN" | "STAFF",
): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/restaurants/${RESTAURANT_ID}/members/invite`,
    { method: "POST", body: JSON.stringify({ email, role }) },
  );
  if ("error" in result) return { error: result.error };
  return {};
}

export async function getPromoCodes(): Promise<PromoCode[]> {
  const result = await apiFetch<PromoCode[]>(
    `/restaurants/${RESTAURANT_ID}/promo-codes`,
  );
  if ("data" in result) return result.data;
  return [];
}

export async function createPromoCode(payload: {
  code: string;
  discountType: "PERCENTAGE" | "FIXED";
  discountValue: number;
  minOrderAmount?: number;
  maxUses?: number;
  expiresAt?: string;
  isActive?: boolean;
}): Promise<{ data?: PromoCode; error?: string }> {
  const result = await apiFetch<PromoCode>(
    `/restaurants/${RESTAURANT_ID}/promo-codes`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return "data" in result ? { data: result.data } : { error: result.error };
}

export async function deletePromoCode(
  promoCodeId: string,
): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/restaurants/${RESTAURANT_ID}/promo-codes/${promoCodeId}`,
    { method: "DELETE" },
  );
  return "error" in result ? { error: result.error } : {};
}

export async function removeMember(
  memberId: string,
): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/restaurants/${RESTAURANT_ID}/members/${memberId}`,
    { method: "DELETE" },
  );
  return "error" in result ? { error: result.error } : {};
}

export async function getExceptionalHours(
  restaurantId?: string,
): Promise<ExceptionalHour[]> {
  const rid = restaurantId ?? RESTAURANT_ID;
  const res = await fetch(
    `${API_URL}/api/v1/restaurants/${rid}/exceptional-hours`,
    { next: { revalidate: 3600 } },
  );
  const json = await res.json();
  return json.data ?? [];
}

export async function createExceptionalHour(payload: {
  date: string;
  isClosed?: boolean;
  openTime?: string;
  closeTime?: string;
  label?: string;
}): Promise<{ data?: ExceptionalHour; error?: string }> {
  const result = await apiFetch<ExceptionalHour>(
    `/restaurants/${RESTAURANT_ID}/exceptional-hours`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return "data" in result ? { data: result.data } : { error: result.error };
}

export async function deleteExceptionalHour(
  id: string,
): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/restaurants/${RESTAURANT_ID}/exceptional-hours/${id}`,
    { method: "DELETE" },
  );
  return "error" in result ? { error: result.error } : {};
}

export async function updateOpeningHours(
  hours: Array<{
    dayOfWeek: number;
    openTime: string;
    closeTime: string;
    order: number;
  }>,
): Promise<OpeningHour[]> {
  const result = await apiFetch<OpeningHour[]>(
    `/restaurants/${RESTAURANT_ID}/opening-hours`,
    { method: "PUT", body: JSON.stringify(hours) },
  );
  if ("data" in result) return result.data;
  return [];
}

export async function uploadImage(file: File): Promise<string | null> {
  const authHeaders = await getAuthHeader();
  const formData = new FormData();
  formData.append("image", file);
  const res = await fetch(
    `${API_URL}/api/v1/restaurants/${RESTAURANT_ID}/upload`,
    {
      method: "POST",
      headers: authHeaders,
      body: formData,
    },
  );
  const json = await res.json();
  return json.data?.url ?? null;
}

export async function deleteImage(imageUrl: string): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/restaurants/${RESTAURANT_ID}/upload`,
    { method: "DELETE", body: JSON.stringify({ imageUrl }) },
  );
  return "error" in result ? { error: result.error } : {};
}

export async function refundOrder(orderId: string) {
  return apiFetch<{ order: Order; refund: { id: string; status: string } }>(
    `/checkout/restaurants/${RESTAURANT_ID}/orders/${orderId}/refund`,
    { method: "POST" },
  );
}

// ── Product & Category management (ADMIN) ────────────────────────────────────

export async function getMenuAdmin(): Promise<Category[]> {
  const result = await apiFetch<Category[]>(
    `/menu/restaurants/${RESTAURANT_ID}/menu`,
  );
  if ("data" in result) return result.data;
  return [];
}

export async function createProduct(payload: {
  name: string;
  description: string;
  imageUrl: string;
  price: number;
  tags?: string[];
  discount?: number;
  isAvailable?: boolean;
  displayOrder?: number;
  categorieId: string;
}): Promise<{ data?: Product; error?: string }> {
  const result = await apiFetch<Product>(
    `/menu/restaurants/${RESTAURANT_ID}/products`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return "data" in result ? { data: result.data } : { error: result.error };
}

export async function updateProduct(
  productId: string,
  payload: Partial<{
    name: string;
    description: string;
    imageUrl: string;
    price: number;
    tags: string[];
    discount: number;
    isAvailable: boolean;
    displayOrder: number;
    categorieId: string;
  }>,
): Promise<{ data?: Product; error?: string }> {
  const result = await apiFetch<Product>(
    `/menu/restaurants/${RESTAURANT_ID}/products/${productId}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  return "data" in result ? { data: result.data } : { error: result.error };
}

export async function deleteProduct(
  productId: string,
): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/menu/restaurants/${RESTAURANT_ID}/products/${productId}`,
    { method: "DELETE" },
  );
  return "error" in result ? { error: result.error } : {};
}

export async function createCategory(payload: {
  name: string;
  subHeading?: string;
  displayOrder: number;
}): Promise<{ data?: Category; error?: string }> {
  const result = await apiFetch<Category>(
    `/menu/restaurants/${RESTAURANT_ID}/categories`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return "data" in result ? { data: result.data } : { error: result.error };
}

export async function updateCategory(
  categorieId: string,
  payload: Partial<{
    name: string;
    subHeading: string;
    displayOrder: number;
  }>,
): Promise<{ data?: Category; error?: string }> {
  const result = await apiFetch<Category>(
    `/menu/restaurants/${RESTAURANT_ID}/categories/${categorieId}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  return "data" in result ? { data: result.data } : { error: result.error };
}

export async function deleteCategory(
  categorieId: string,
): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/menu/restaurants/${RESTAURANT_ID}/categories/${categorieId}`,
    { method: "DELETE" },
  );
  return "error" in result ? { error: result.error } : {};
}

// ── Option Group & Choice management (ADMIN) ─────────────────────────────────

export async function createOptionGroup(payload: {
  name: string;
  hasMultiple?: boolean;
  isRequired?: boolean;
  minQuantity?: number;
  maxQuantity?: number;
  displayOrder?: number;
  choices?: Array<{ name: string; priceModifier?: number; displayOrder?: number }>;
}): Promise<{ data?: OptionGroup; error?: string }> {
  const result = await apiFetch<OptionGroup>(
    `/menu/restaurants/${RESTAURANT_ID}/option-groups`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return "data" in result ? { data: result.data } : { error: result.error };
}

export async function updateOptionGroup(
  groupId: string,
  payload: Partial<{
    name: string;
    hasMultiple: boolean;
    isRequired: boolean;
    minQuantity: number;
    maxQuantity: number;
    displayOrder: number;
  }>,
): Promise<{ data?: OptionGroup; error?: string }> {
  const result = await apiFetch<OptionGroup>(
    `/menu/restaurants/${RESTAURANT_ID}/option-groups/${groupId}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  return "data" in result ? { data: result.data } : { error: result.error };
}

export async function deleteOptionGroup(
  groupId: string,
): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/menu/restaurants/${RESTAURANT_ID}/option-groups/${groupId}`,
    { method: "DELETE" },
  );
  return "error" in result ? { error: result.error } : {};
}

export async function addOptionChoice(
  groupId: string,
  payload: { name: string; priceModifier?: number; displayOrder?: number },
): Promise<{ data?: OptionChoice; error?: string }> {
  const result = await apiFetch<OptionChoice>(
    `/menu/restaurants/${RESTAURANT_ID}/option-groups/${groupId}/option-choices`,
    { method: "POST", body: JSON.stringify(payload) },
  );
  return "data" in result ? { data: result.data } : { error: result.error };
}

export async function updateOptionChoice(
  choiceId: string,
  payload: Partial<{ name: string; priceModifier: number; displayOrder: number }>,
): Promise<{ data?: OptionChoice; error?: string }> {
  const result = await apiFetch<OptionChoice>(
    `/menu/restaurants/${RESTAURANT_ID}/option-choices/${choiceId}`,
    { method: "PUT", body: JSON.stringify(payload) },
  );
  return "data" in result ? { data: result.data } : { error: result.error };
}

export async function deleteOptionChoice(
  choiceId: string,
): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/menu/restaurants/${RESTAURANT_ID}/option-choices/${choiceId}`,
    { method: "DELETE" },
  );
  return "error" in result ? { error: result.error } : {};
}

export async function linkOptionGroups(
  productId: string,
  optionGroupIds: string[],
): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/menu/restaurants/${RESTAURANT_ID}/products/${productId}/option-groups`,
    { method: "POST", body: JSON.stringify({ optionGroupIds }) },
  );
  return "error" in result ? { error: result.error } : {};
}

export async function unlinkOptionGroup(
  productId: string,
  groupId: string,
): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/menu/restaurants/${RESTAURANT_ID}/products/${productId}/option-groups/${groupId}`,
    { method: "DELETE" },
  );
  return "error" in result ? { error: result.error } : {};
}

export async function reorderProductOptionGroups(
  productId: string,
  orderedIds: string[],
): Promise<{ error?: string }> {
  const result = await apiFetch<{ message: string }>(
    `/menu/restaurants/${RESTAURANT_ID}/products/${productId}/option-groups/reorder`,
    { method: "PUT", body: JSON.stringify({ orderedIds }) },
  );
  return "error" in result ? { error: result.error } : {};
}

// ── Stripe Connect (OWNER) ────────────────────────────────────────────────────

export async function updatePreparationLevel(
  level: "EASY" | "MEDIUM" | "BUSY" | "CLOSED",
): Promise<{ error?: string }> {
  const result = await apiFetch<Restaurant>(
    `/restaurants/${RESTAURANT_ID}/preparation-level`,
    { method: "PATCH", body: JSON.stringify({ preparationLevel: level }) },
  );
  return "error" in result ? { error: result.error } : {};
}

export async function initiateStripeOnboarding(): Promise<{
  data?: { url: string };
  error?: string;
}> {
  return apiFetch<{ url: string }>(
    `/restaurants/${RESTAURANT_ID}/stripe/onboard`,
    { method: "POST" },
  );
}

export async function getStripeStatus(): Promise<{
  data?: {
    connected: boolean;
    chargesEnabled?: boolean;
    detailsSubmitted?: boolean;
  };
  error?: string;
}> {
  return apiFetch<{
    connected: boolean;
    chargesEnabled?: boolean;
    detailsSubmitted?: boolean;
  }>(`/restaurants/${RESTAURANT_ID}/stripe/status`);
}
