import api from "../api";

export const GET_ORDERS = "GET_ORDERS";
export const TOGGLE_ARCHIVE = "TOGGLE_ARCHIVE";
export const DELETE_ORDER = "DELETE_ORDER";

export const getOrders = ({ token }) => {
  return (dispatch) => {
    return api
      .get(`api/private/orders`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
      .then((res) => {
        dispatch({ type: GET_ORDERS, payload: res.data });
      });
  };
};

export const toggleArchive = (payload) => async (dispatch) => {
  try {
    await api.put(
      `${process.env.REACT_APP_API_URL}api/order/${payload.id}/toggle`
    );
    dispatch({ type: "TOGGLE_ARCHIVE", payload: payload });
  } catch (error) {
    console.error("Error while toggling archive", error);
  }
};

export const deleteOrder = (id) => async (dispatch) => {
  try {
    await api.delete(`api/order/${id}`);
    dispatch({ type: "DELETE_ORDER", payload: id });
  } catch (error) {
    console.error("Error while deleting the order", error);
  }
};
