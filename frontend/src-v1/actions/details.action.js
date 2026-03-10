import api from "../api";
export const GET_DETAILS = "GET_DETAILS";

export const getDetails = () => {
  return (dispatch) => {
    return api.get(`api/item/details`).then((res) => {
      dispatch({ type: GET_DETAILS, payload: res.data });
    });
  };
};
