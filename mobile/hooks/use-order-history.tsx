import { useCallback, useEffect, useRef, useState } from "react";
import { apiFetch } from "@/lib/api";
import { Order, Pagination } from "@/types/api";
import { useRestaurant } from "@/context/restaurant";

export function useOrderHistory() {
  const { selectedRestaurant } = useRestaurant();
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isFetchingRef = useRef(false);

  const fetchPage = useCallback(
    async (pageToFetch: number) => {
      if (!selectedRestaurant || isFetchingRef.current) return;
      isFetchingRef.current = true;
      setIsLoading(true);
      setError(null);

      const result = await apiFetch<Order[]>(
        `/restaurants/${selectedRestaurant.id}/orders?status=DELIVERED,CANCELLED&page=${pageToFetch}&limit=20`,
      );

      if ("error" in result) {
        setError(result.error);
      } else {
        // apiFetch<T> types result.data as T, but the full JSON body is
        // { data: Order[], pagination: {...} } — pagination lives at root level
        const pagination = (result as unknown as { pagination: Pagination }).pagination;
        setOrders((prev) =>
          pageToFetch === 1 ? result.data : [...prev, ...result.data],
        );
        setHasMore(pageToFetch < pagination.totalPages);
      }

      setIsLoading(false);
      isFetchingRef.current = false;
    },
    [selectedRestaurant],
  );

  useEffect(() => {
    setPage(1);
    fetchPage(1);
  }, [fetchPage]);

  const loadMore = useCallback(() => {
    if (isLoading || !hasMore) return;
    const next = page + 1;
    setPage(next);
    fetchPage(next);
  }, [isLoading, hasMore, page, fetchPage]);

  const reset = useCallback(() => {
    setOrders([]);
    setPage(1);
    setHasMore(true);
    setError(null);
    fetchPage(1);
  }, [fetchPage]);

  return { orders, isLoading, hasMore, error, loadMore, reset };
}
