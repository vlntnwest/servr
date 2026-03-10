import React, { useEffect, useState } from "react";
import { useSelector, useDispatch } from "react-redux";
import { isEmpty } from "../../Utils";
import { Alert, CircularProgress } from "@mui/material";
import Box from "@mui/material/Box";
import Masonry from "@mui/lab/Masonry";
import OrderCard from "../OrdersComponents/OrderCard";
import { getOrders } from "../../../actions/order.action";
import { useAuth0 } from "@auth0/auth0-react";

const OrdersContainer = () => {
  const dispatch = useDispatch();
  const { getAccessTokenSilently } = useAuth0();
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;

  const ordersData = useSelector((state) => state.orderReducer);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: audience,
            scope: "read:current_user",
          },
        });

        await dispatch(getOrders({ token }));
      } catch (error) {
        setError(
          error.response
            ? error.response.data.error
            : "Error fetching orders data"
        );
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [dispatch, audience, getAccessTokenSilently]);

  const unarchivedOrders = !isEmpty(ordersData)
    ? ordersData.filter((order) => !order.isArchived)
    : [];

  const sortedOrders = unarchivedOrders.sort(
    (a, b) => new Date(a.createdAt) - new Date(b.createdAt)
  );

  if (loading) {
    return <CircularProgress />;
  }

  if (error) {
    return <Alert severity="error">Error: {error}</Alert>;
  }

  return (
    <Box sx={{ width: "100%" }}>
      <Masonry columns={{ xs: 1, sm: 2, md: 3, lg: 4 }} spacing={2} sequential>
        {sortedOrders.map((order, index) => (
          <OrderCard key={index} order={order} />
        ))}
        {/*Need an empty div to prevent masory error when archiving last order*/}
        {isEmpty(sortedOrders) ? null : <div></div>}
      </Masonry>
    </Box>
  );
};

export default OrdersContainer;
