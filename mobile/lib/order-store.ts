import { Order } from "@/types/api";

let _order: Order | null = null;

export const orderStore = {
  set: (order: Order) => { _order = order; },
  get: () => _order,
  clear: () => { _order = null; },
};
