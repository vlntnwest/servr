import React from "react";
import CartHeader from "./CartHeader";
import CartSummary from "./CartSummary";
import CartValidator from "./CartValidator";
import { Box, Container, Typography } from "@mui/material";
import { useShoppingCart } from "../../Context/ShoppingCartContext";

const Cart = ({ setOpen }) => {
  const { cartItems } = useShoppingCart();

  return (
    <Box
      sx={{
        height: { xs: "100dvh", md: "100%" },
        display: "flex",
        flexDirection: "column",
        border: "1px solid  #0000000a",
      }}
    >
      {cartItems.length > 0 ? (
        <Box
          sx={{
            flexGrow: "1",
            overflowY: "auto",
            overflowX: "hidden",
            display: "flex",
            flexDirection: "column",
          }}
        >
          <CartHeader setOpen={setOpen} />
          <CartSummary />
        </Box>
      ) : (
        <Container
          sx={{
            height: "100% ",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <Typography
            variant="h2"
            fontSize={18}
            pt={1}
            pb={2}
            color="textPrimary"
          >
            Votre panier est vide
          </Typography>
        </Container>
      )}
      <CartValidator setOpen={setOpen} />
    </Box>
  );
};

export default Cart;
