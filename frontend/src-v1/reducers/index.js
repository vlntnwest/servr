import { combineReducers } from "redux";
import mealReducer from "./meal.reducer";
import orderReducer from "./order.reducer";
import userReducer from "./users.reducer";
import tableReducer from "./table.reducer";
import detailsReducer from "./details.reducer";
import foodReducer from "./food.reducer";

export default combineReducers({
  mealReducer,
  orderReducer,
  userReducer,
  tableReducer,
  detailsReducer,
  foodReducer,
});
