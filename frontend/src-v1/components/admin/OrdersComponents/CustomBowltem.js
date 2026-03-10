import React from "react";
import { Box, Typography } from "@mui/material";

const CustomBowlItem = ({
  name,
  quantity,
  base,
  proteins,
  garnishes,
  toppings,
  sauces,
  extraProtein,
}) => {
  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="h5">
        {name} x{quantity}
      </Typography>
      <Typography variant="h6">Base:</Typography>
      <Typography variant="body1">{base}</Typography>
      <Typography variant="h6">Protéine:</Typography>
      <Typography variant="body1">{proteins}</Typography>
      <Typography variant="h6">Accompagnements:</Typography>
      <Typography variant="body1">{garnishes.join(", ")}</Typography>
      <Typography variant="h6">Toppings:</Typography>
      <Typography variant="body1">{toppings.join(", ")}</Typography>
      <Typography variant="h6">Sauces:</Typography>
      <Typography variant="body1">{sauces.join(", ")}</Typography>
      {extraProtein && extraProtein.length > 0 ? (
        <>
          <Typography variant="h6">Extra Proteine:</Typography>
          <Typography variant="body1">{extraProtein.join(", ")}</Typography>
        </>
      ) : null}
    </Box>
  );
};
export default CustomBowlItem;
