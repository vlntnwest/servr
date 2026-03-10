import {
  GET_ORDERS,
  TOGGLE_ARCHIVE,
  DELETE_ORDER,
} from "../actions/order.action";

const initialState = {};

export default function orderReducer(state = initialState, action) {
  switch (action.type) {
    case GET_ORDERS:
      return action.payload;
    case TOGGLE_ARCHIVE:
      return state.map((order) =>
        order._id === action.payload
          ? { ...order, isArchived: !order.isArchived }
          : order
      );
    case DELETE_ORDER:
      return state.filter((order) => order._id !== action.payload);
    default:
      return state;
  }
}
