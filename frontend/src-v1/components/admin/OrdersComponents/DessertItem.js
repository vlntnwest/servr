import React from "react";
import { Box, Typography } from "@mui/material";

const DessertItem = ({ name, quantity }) => {
  return (
    <Box sx={{ pt: 2 }}>
      <Typography variant="h5">
        {name} x{quantity}
      </Typography>
    </Box>
  );
};

export default DessertItem;
