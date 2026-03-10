import { Box, Card, Typography } from "@mui/material";
import React from "react";
import RecapLine from "./RecapLine";
import { useShoppingCart } from "../../Context/ShoppingCartContext";
import OrderMessage from "./OrderMessage";
import CartTimer from "./CartTimer";

const CartSummary = () => {
  const { cartItems, updateItemCount, isClickAndCollect } = useShoppingCart();

  return (
    <Box
      p={2}
      sx={{
        flexGrow: "1",
        backgroundColor: "white",
      }}
    >
      <Typography variant="h2" pt={1} pb={2}>
        Panier
      </Typography>
      <Card sx={{ border: "1px solid rgba(0, 0, 0, 0.05)" }}>
        {cartItems.map((item, index) => (
          <RecapLine
            key={index}
            item={item}
            updateItemCount={updateItemCount}
            isLast={index === cartItems.length - 1}
          />
        ))}
      </Card>
      <OrderMessage />
      {isClickAndCollect && <CartTimer />}
    </Box>
  );
};

export default CartSummary;
