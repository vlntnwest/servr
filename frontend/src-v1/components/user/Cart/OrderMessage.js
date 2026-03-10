import React, { useState } from "react";
import { Box, Button, Collapse, TextField, Typography } from "@mui/material";
import { useShoppingCart } from "../../Context/ShoppingCartContext";

const OrderMessage = () => {
  const { message, setMessage } = useShoppingCart();
  const [open, setOpen] = useState(false);

  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };

  const handleMessage = (e) => {
    setMessage(e.target.value);
  };

  return (
    <>
      <Button
        color="secondary"
        disableElevation
        fullWidth
        sx={{
          py: 1.5,
          pl: 1.5,
          mt: 2,
          border: "1px solid rgba(0, 0, 0, 0.05)",
          textTransform: "none",
          flexDirection: "column",
        }}
        onClick={toggleDrawer(!open)}
      >
        <Box
          sx={{
            width: "100%",
            display: "flex",
            justifyContent: "space-between",
          }}
        >
          <Typography variant="body1">
            Indications pour le restaurant
          </Typography>
          <Typography variant="body1" sx={{ color: "#1f4493" }}>
            Ajouter
          </Typography>
        </Box>
        <Collapse in={!open} collapsedSize={0} sx={{ width: "100%" }}>
          <Box sx={{ width: "100%", textAlign: "left", mt: 0.5 }}>
            <Typography variant="body2">
              {message === "" ? "Aucune indication renseignée" : message}
            </Typography>
          </Box>
        </Collapse>
      </Button>
      <Collapse in={open} collapsedSize={0}>
        <Box
          sx={{
            backgroundColor: "white",
            flex: "1",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            my: 1,
          }}
        >
          <TextField
            fullWidth
            id="outlined-basic"
            placeholder="Ex. : « Merci de ne pas mettre de riz »"
            value={message !== "Aucune indication renseignée" ? message : ""}
            variant="outlined"
            multiline
            rows={5}
            onChange={handleMessage}
            sx={{ backgroundColor: "#FFF", borderColor: "#0000000a" }}
          />
          <Button
            variant="contained"
            fullWidth
            sx={{ py: 1.5, mt: 1 }}
            onClick={toggleDrawer(false)}
          >
            Enregistrer
          </Button>
        </Box>
      </Collapse>
    </>
  );
};

export default OrderMessage;
