import api from "../api";

export const GET_MEALS = "GET_MEALS";

export const getMeals = () => {
  return (dispatch) => {
    return api.get(`api/item`).then((res) => {
      dispatch({ type: GET_MEALS, payload: res.data });
    });
  };
};
