import React, { useEffect } from "react";
import { Box, Radio, RadioGroup, Typography } from "@mui/material";
import OrderDate from "./OrderDate";
import { useShoppingCart } from "../../Context/ShoppingCartContext";
import { useShop } from "../../Context/ShopContext";

const CartTimer = () => {
  const { selectedDay, setSelectedDay } = useShoppingCart();
  const { canOrderNow, availableDates } = useShop();

  const handleChange = (event) => {
    setSelectedDay(event.target.value);
  };

  const controlProps = (item) => ({
    checked: selectedDay === item,
    onChange: handleChange,
    value: item,
    name: "color-radio-button-demo",
    inputProps: { "aria-label": item },
  });

  useEffect(() => {
    if (!canOrderNow) {
      setSelectedDay("after");
    }
  }, [canOrderNow, setSelectedDay]);

  return (
    <Box>
      <Box
        color="secondary"
        sx={{
          mt: 2,
          padding: "12px 16px 12px 12px",
          border: "1px solid rgba(0, 0, 0, 0.05)",
          textTransform: "none",
          flexDirection: "column",
          color: "rgba(0, 0, 0, 0.87)",
          backgroundColor: "white",
        }}
      >
        <RadioGroup
          aria-labelledby="delivery-timing-label"
          value={selectedDay}
          name="delivery-timing-group"
        >
          {canOrderNow && (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
              onClick={() => setSelectedDay("now")}
            >
              <Typography variant="body1">Au plus vite</Typography>
              <Radio {...controlProps("now")} />
            </Box>
          )}
          {availableDates.length > 0 ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
              onClick={() => setSelectedDay("after")}
            >
              <Typography variant="body1">Plus tard</Typography>
              <Radio {...controlProps("after")} />
            </Box>
          ) : (
            <Typography variant="body1">
              Le restaurant est fermé le dimanche et le lundi.
            </Typography>
          )}
        </RadioGroup>
        <Box>{selectedDay === "after" && <OrderDate />}</Box>
      </Box>
    </Box>
  );
};

export default CartTimer;
