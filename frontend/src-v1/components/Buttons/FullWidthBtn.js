import React from "react";
import { Box, Button, CircularProgress } from "@mui/material";

const FullWidthBtn = ({ handleAction, name, isSubmitting, variant, br0 }) => {
  return (
    <Button
      color="primary"
      disableElevation
      fullWidth
      sx={{
        p: 0,
        display: "block",
        ...(br0 && { borderRadius: 0 }),
      }}
      onClick={handleAction}
      variant={variant ? variant : "contained"}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
        }}
      >
        <Box
          sx={{
            flex: 1,
            py: 2,
            pl: 2,
            pr: 2,
            mr: "auto",
            alignItems: "flex-start",
          }}
        >
          {isSubmitting ? (
            <CircularProgress color="secondary" size={24.5} />
          ) : (
            name
          )}
        </Box>
      </Box>
    </Button>
  );
};

export default FullWidthBtn;
