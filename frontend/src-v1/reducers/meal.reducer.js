import { GET_MEALS } from "../actions/meal.action";

const initialState = {};

export default function mealReducer(state = initialState, action) {
  switch (action.type) {
    case GET_MEALS:
      return action.payload;
    default:
      return state;
  }
}
