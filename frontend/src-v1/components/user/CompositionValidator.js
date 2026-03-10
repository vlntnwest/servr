import React from "react";
import { Box, Button, CircularProgress, Typography } from "@mui/material";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import { formatEuros } from "../Utils";

const CompositionValidator = ({
  count,
  handleIncrement,
  handleDecrement,
  isAddButtonDisabled,
  sendToCart,
  isLoading,
  calculateTotalPrice,
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      alignItems: "center",
      width: "100%",
      backgroundColor: "#fff",
      p: 2,
    }}
  >
    <Box
      sx={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-evenly",
        pb: 2,
      }}
    >
      <RemoveCircleOutlineIcon
        color={count > 1 ? "primary" : "disabled"}
        onClick={handleDecrement}
        style={{ cursor: count > 0 ? "pointer" : "not-allowed" }}
      />
      <Typography
        variant="body1"
        sx={{ margin: "0 8px", minWidth: "20px", textAlign: "center" }}
      >
        {count}
      </Typography>
      <AddCircleOutlineIcon
        color="primary"
        onClick={handleIncrement}
        style={{ cursor: "pointer" }}
      />
    </Box>
    <Button
      variant="contained"
      fullWidth
      sx={{ py: 1.5 }}
      disabled={isAddButtonDisabled}
      onClick={sendToCart}
    >
      {isLoading ? (
        <CircularProgress color="secondary" size={24.5} />
      ) : (
        `Ajouter pour ${formatEuros(calculateTotalPrice())}`
      )}
    </Button>
  </Box>
);

export default CompositionValidator;
