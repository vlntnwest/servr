import api from "../api";

export const GET_FOODS = "GET_FOODS";
export const ADD_FOOD = "ADD_FOOD";
export const EDIT_FOOD = "EDIT_FOOD";
export const DELETE_FOOD = "DELETE_FOOD";

export const getFoods = () => {
  return (dispatch) => {
    return api
      .get(`api/food/`)
      .then((res) => {
        dispatch({ type: GET_FOODS, payload: res.data });
        return { sucess: true };
      })
      .catch((err) => {
        console.log(err);
        return { sucess: false, error: err };
      });
  };
};

export const addFood = (name) => {
  return (dispatch) => {
    return api
      .post(`api/food/`, { name })
      .then((res) => {
        dispatch({ type: ADD_FOOD, payload: res.data.food });
        return { sucess: true };
      })
      .catch((err) => {
        console.log(err);
        return { sucess: false, error: err };
      });
  };
};

export const editFood = (id, data) => {
  return (dispatch) => {
    return api
      .put(`api/food/${id}`, data)
      .then((res) => {
        dispatch({ type: EDIT_FOOD, payload: res.data.food });
      })
      .catch((err) => {
        console.error("Erreur lors de la mise à jour de l'aliment:", err);
        dispatch({
          type: "EDIT_FOOD_ERROR",
          payload: err.response ? err.response.data : err.message,
        });
        return { success: false, error: err };
      });
  };
};

export const deleteFood = (ids) => {
  return (dispatch) => {
    return api
      .delete(`api/food/`, { data: { ids } })
      .then((res) => {
        dispatch({ type: DELETE_FOOD, payload: ids });
      })
      .catch((err) => {
        console.log(err);
        return { sucess: false, error: err };
      });
  };
};
