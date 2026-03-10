import { DELETE_USER, EDIT_USER, GET_USER } from "../actions/users.action";

const initialState = {};

export default function userReducer(state = initialState, action) {
  switch (action.type) {
    case GET_USER:
      return action.payload;
    case EDIT_USER:
      return {
        ...state,
        ...action.payload,
      };
    case DELETE_USER:
      return {};
    default:
      return state;
  }
}
