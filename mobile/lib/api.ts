import Constants from "expo-constants";
import { supabase } from "@/lib/supabase";
import { Order } from "@/types/api";

let _restaurantId = "";
export function setRestaurantId(id: string) {
  _restaurantId = id;
}
export function getRestaurantId(): string {
  return _restaurantId;
}

export function getApiUrl(): string {
  if (__DEV__) {
    const hostUri = Constants.expoConfig?.hostUri;
    if (hostUri) {
      const host = hostUri.split(":")[0];
      return `http://${host}:5001`;
    }
    const devHost = process.env.EXPO_PUBLIC_DEV_HOST;
    if (devHost) return `http://${devHost}:5001`;
  }
  return process.env.EXPO_PUBLIC_API_URL!;
}

async function getAuthHeader(): Promise<Record<string, string>> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.access_token) return {};
  return { Authorization: `Bearer ${session.access_token}` };
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
): Promise<{ data: T } | { error: string }> {
  const authHeaders = await getAuthHeader();

  const url = `${getApiUrl()}/api/v1${path}`;
  try {
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...authHeaders,
        ...(options.headers as Record<string, string>),
      },
    });

    if (res.status === 401) {
      const { error: refreshError } = await supabase.auth.refreshSession();
      if (refreshError) {
        return { error: "Session expirée, veuillez vous reconnecter." };
      }
      const freshHeaders = await getAuthHeader();
      const retryRes = await fetch(`${getApiUrl()}/api/v1${path}`, {
        ...options,
        headers: {
          "Content-Type": "application/json",
          ...freshHeaders,
          ...(options.headers as Record<string, string>),
        },
      });
      if (!retryRes.ok) return { error: `Erreur ${retryRes.status}` };
      return retryRes.json();
    }

    if (!res.ok) return { error: `Erreur ${res.status}` };
    return res.json();
  } catch (e) {
    console.log("[api] fetch error:", url, e);
    return { error: "Erreur réseau" };
  }
}

export async function getOrder(
  orderId: string,
): Promise<{ data: Order } | { error: string }> {
  return apiFetch<Order>(`/restaurants/${_restaurantId}/orders/${orderId}`);
}

export async function updateOrderStatus(
  orderId: string,
  targetStatus: string,
): Promise<{ data: unknown } | { error: string }> {
  return apiFetch(`/restaurants/${_restaurantId}/orders/${orderId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status: targetStatus }),
  });
}
