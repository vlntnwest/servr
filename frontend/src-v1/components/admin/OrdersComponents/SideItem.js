import React from "react";
import { Box, Typography } from "@mui/material";

const SideItem = ({ name, quantity, sauces }) => {
  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="h6">
        {name} x{quantity}
      </Typography>
      <Typography variant="body1">Sauces:</Typography>
      <Typography variant="body2">{sauces.join(", ")}</Typography>
    </Box>
  );
};

export default SideItem;
