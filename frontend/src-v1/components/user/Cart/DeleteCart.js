import { Box, Button, IconButton, Typography } from "@mui/material";
import React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import { useShoppingCart } from "../../Context/ShoppingCartContext";
import { useShop } from "../../Context/ShopContext";

const DeleteCart = ({ toggleDrawer, setOpen }) => {
  const { clearCart } = useShoppingCart();
  const { isMobile } = useShop();

  const deleteCart = () => {
    clearCart();
    toggleDrawer(false)();
    if (isMobile) {
      setOpen(false);
    }
  };

  return (
    <Box>
      <IconButton
        onClick={toggleDrawer(false)}
        sx={{ position: "absolute", right: 16, top: 16 }}
      >
        <CloseRoundedIcon />
      </IconButton>
      <Box px={8} pt={4} pb={2}>
        <Box>
          <Typography variant="body1" sx={{ textAlign: "center" }}>
            Souhaitez vous vraiment supprimer l'ensemble du panier?
          </Typography>
        </Box>
      </Box>
      <Box>
        <Box sx={{ px: 2, pb: 1 }}>
          <Button
            variant="contained"
            color="error"
            fullWidth
            sx={{ py: 1.5 }}
            onClick={deleteCart}
          >
            Retirer tous les produits
          </Button>
        </Box>
        <Box sx={{ px: 2, pb: 2 }}>
          <Button
            variant="outlined"
            fullWidth
            sx={{ py: 1.5 }}
            onClick={toggleDrawer(false)}
          >
            Annuler
          </Button>
        </Box>
      </Box>
    </Box>
  );
};

export default DeleteCart;
