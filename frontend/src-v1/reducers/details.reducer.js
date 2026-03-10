import { GET_DETAILS } from "../actions/details.action";

const initialState = {};

export default function detailsReducer(state = initialState, action) {
  switch (action.type) {
    case GET_DETAILS:
      return action.payload;
    default:
      return state;
  }
}
