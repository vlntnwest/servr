import { Box } from "@mui/system";
import axios from "axios";
import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Header from "../components/user/Header";
import ShopProvider from "../components/Context/ShopContext";
import ShoppingCartProvider from "../components/Context/ShoppingCartContext";
import GuestProvider from "../components/Context/guestInfos";
import { Card, CardContent, Divider, Typography } from "@mui/material";
import { formatEuros, isEmpty } from "../components/Utils";

const OrderConfirmed = () => {
  return (
    <ShopProvider>
      <ShoppingCartProvider>
        <GuestProvider>
          <ConfirmationDetails />
        </GuestProvider>
      </ShoppingCartProvider>
    </ShopProvider>
  );
};

export default OrderConfirmed;

const ConfirmationDetails = () => {
  const { orderId } = useParams();
  const [order, setOrder] = useState({});

  const { orderDate, orderNumber, totalPrice, items, orderType } = order;

  useEffect(() => {
    const fetchData = async () => {
      try {
        const order = await axios.get(
          `${process.env.REACT_APP_API_URL}api/order/confirmed/${orderId}`
        );
        console.log(order.data);

        setOrder(order.data);
      } catch (error) {
        console.error(error);
      }
    };
    fetchData();
  }, [orderId]);

  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100vw",
        height: "100dvh",
      }}
    >
      <Header auth />
      <Box
        py={2}
        sx={{
          flex: 1,
          backgroundColor: "rgba(208, 208, 208, 0.12)",
        }}
      >
        <Card
          sx={{
            display: "flex",
            p: 2,
            maxWidth: 400,
            margin: "0 auto",
          }}
        >
          <CardContent sx={{ width: "100%" }}>
            <Box pb={2}>
              <Typography variant="h2">Commande #{orderNumber}</Typography>
              {orderType === "clickandcollect" && (
                <Typography variant="body" pt={3}>
                  Votre commande sera prête {orderDate?.date.toLowerCase()} à{" "}
                  {orderDate?.time}.
                </Typography>
              )}
            </Box>
            <Divider />
            <Box sx={{ width: "100%", textAlign: "left" }} py={2}>
              <Typography variant="h3" mb={1}>
                Votre commande ({items?.length} produits)
              </Typography>
              <Box>
                {items?.map((item) => (
                  <Box
                    sx={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "flex-start",
                    }}
                  >
                    <Box sx={{ mr: 1.5, pl: 2, py: 1.5 }}>
                      <Typography
                        sx={{ fontWeight: "400", textTransform: "lowercase" }}
                      >
                        {item.quantity}x
                      </Typography>
                    </Box>
                    <Box
                      sx={{
                        flex: 1,
                        py: 1.5,
                        pl: 1.5,
                        pr: 2,
                        mr: "auto",
                        alignItems: "flex-start",
                      }}
                    >
                      <Typography variant="body1" sx={{ textAlign: "left" }}>
                        {item.name}
                      </Typography>
                      {!isEmpty(item.base) && <DetailsList name={item.base} />}
                      {!isEmpty(item.garnishes) && (
                        <DetailsList name={item.garnishes} />
                      )}
                      {!isEmpty(item.proteins) && (
                        <DetailsList name={item.proteins} />
                      )}
                      {!isEmpty(item.sauces) && (
                        <DetailsList name={item.sauces} />
                      )}
                      {!isEmpty(item.extraProtein) && (
                        <DetailsList name={item.extraProtein} />
                      )}
                    </Box>
                    <Box sx={{ ml: 1.5 }}>
                      <Box
                        sx={{
                          display: "flex",
                          px: 2,
                          py: 1.5,
                          alignItems: "center",
                        }}
                      >
                        <Typography sx={{ fontWeight: "400" }}>
                          {item.price && formatEuros(item.price)}
                        </Typography>
                      </Box>
                    </Box>
                  </Box>
                ))}
              </Box>
            </Box>
            <Divider />
            <Box
              sx={{
                width: "100%",
                display: "flex",
              }}
              pt={2}
            >
              <Box sx={{ flex: 1 }}>
                <Typography
                  variant="body1"
                  color="textPrimary"
                  sx={{ fontWeight: 700 }}
                >
                  Total de la commande
                </Typography>
              </Box>
              <Box>
                <Typography color="textPrimary" sx={{ fontWeight: 700 }}>
                  {totalPrice && formatEuros(totalPrice / 100)}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Box>
    </Box>
  );
};

const DetailsList = ({ name }) => {
  const displayName =
    Array.isArray(name) && name.length > 1 ? name.join(", ") : name;

  return (
    <Typography
      variant="body2"
      sx={{
        textAlign: "left",
        color: "text.secondary",
        textTransform: "none",
        pt: 0.5,
      }}
    >
      {displayName}
    </Typography>
  );
};
