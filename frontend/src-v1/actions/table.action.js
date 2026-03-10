import api from "../api";

export const GET_TABLES = "GET_TABLES";
export const GET_TABLE = "GET_TABLE";
export const GET_TABLE_FAILURE = "GET_TABLE_FAILURE";
export const TOGGLE_TABLES = "TOGGLE_TABLES";

export const getTables = () => {
  return (dispatch) => {
    return api.get(`api/table`).then((res) => {
      dispatch({ type: GET_TABLES, payload: res.data });
    });
  };
};

export const getTable = (tableNumber) => {
  return (dispatch) => {
    return api
      .get(`api/table/${tableNumber}`)
      .then((res) => {
        if (res.data && Object.keys(res.data).length > 0) {
          dispatch({ type: GET_TABLE, payload: res.data });
        } else {
          dispatch({ type: GET_TABLE_FAILURE, payload: "Table not found" });
        }
      })
      .catch((error) => {
        // Si la table n'existe pas ou autre erreur serveur
        const errorMessage = error.response
          ? error.response.data.error || "Table not found"
          : "Server error";
        dispatch({ type: GET_TABLE_FAILURE, payload: errorMessage });
      });
  };
};

export const toggleTables = (payload) => async (dispatch) => {
  try {
    await api.put(
      `${process.env.REACT_APP_API_URL}api/table/${payload._id}/toggle`
    );
    dispatch({ type: "TOGGLE_TABLES", payload: payload });
  } catch (error) {
    console.error("Error while toggling tables", error);
  }
};
