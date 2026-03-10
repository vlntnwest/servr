import React, { useEffect, useState } from "react";
import axios from "axios";
import { useSelector } from "react-redux";
import { Box, Card } from "@mui/material";
import OrderCardHistory from "../Card/OrderCardHistory";
import { isEmpty } from "../../Utils";
import { useAuth0 } from "@auth0/auth0-react";

const OrdersList = () => {
  const { getAccessTokenSilently, isAuthenticated } = useAuth0();
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;
  const user = useSelector((state) => state.userReducer);
  const [orders, setOrders] = useState([]);

  useEffect(() => {
    const fetchOrders = async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: audience,
            scope: "read:current_user read:users_app_metadata delete:users",
          },
        });

        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}api/private/orders/history/${user._id}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        );
        setOrders(response.data);
      } catch (error) {
        console.error(error);
      }
    };
    if (isAuthenticated) {
      fetchOrders();
    }
  }, [user._id, audience, getAccessTokenSilently, isAuthenticated]);

  const sortedOrders = !isEmpty(orders)
    ? [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    : [];

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        maxWidth: 1200,
        width: "100%",
      }}
      px={2}
    >
      <Card sx={{ border: "1px solid rgba(0, 0, 0, 0.05)", width: "100%" }}>
        {sortedOrders.map((order, index) => (
          <OrderCardHistory
            order={order}
            key={order._id}
            isLast={index === orders.length - 1}
          />
        ))}
      </Card>
    </Box>
  );
};

export default OrdersList;
