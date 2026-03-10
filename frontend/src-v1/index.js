import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Redux
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import rootReducer from "./reducers";

// Auth
import { Auth0Provider } from "@auth0/auth0-react";
import { SpeedInsights } from "@vercel/speed-insights/react";

const domain = process.env.REACT_APP_AUTH0_DOMAIN;
const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;

const store = configureStore({
  reducer: rootReducer,
  devTools: true,
});

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <Auth0Provider
    domain={domain}
    clientId={clientId}
    authorizationParams={{
      redirect_uri: window.location.origin,
      audience: `https://${domain}/api/v2/`,
      scope:
        "openid profile email read:current_user read:users_app_metadata delete:users",
    }}
  >
    <Provider store={store}>
      <App />
      <SpeedInsights />
    </Provider>
  </Auth0Provider>
);
