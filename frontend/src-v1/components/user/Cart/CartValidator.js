import {
  Box,
  Button,
  CircularProgress,
  Drawer,
  Link,
  Modal,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import { useShoppingCart } from "../../Context/ShoppingCartContext";
import InsideDrawer from "../InsideDrawer";
import CheckoutForm from "../Checkout/CheckoutForm";
import { useAuth0 } from "@auth0/auth0-react";
import FullWidthBtn from "../../Buttons/FullWidthBtn";
import { formatEuros } from "../../Utils";
import { useShop } from "../../Context/ShopContext";
import { useParams } from "react-router-dom";
import axios from "axios";

const modalStyle = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  bgcolor: "background.paper",
  boxShadow: 24,
  p: 2,
  borderRadius: 1,
  minWidth: 300,
};

const CartValidator = ({ setOpen }) => {
  const { isMobile } = useShop();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const { tableNumber } = useParams();

  const [openModal, setOpenModal] = useState(false);
  const handleOpenModal = () => setOpenModal(true);
  const handleCloseModal = () => setOpenModal(false);

  const { isAuthenticated, loginWithRedirect } = useAuth0();

  const [openCheckout, setOpenCheckout] = useState(false);
  const toggleDrawer = (newOpen) => () => setOpenCheckout(newOpen);
  const [isGuest, setIsGuest] = useState(false);

  const { handleOpenCompletedOrderModal, setOrderTime, availableDates } =
    useShop();

  const {
    cartItems,
    clearCart,
    setMessage,
    selectedDate,
    setSelectedDate,
    selectedDay,
    isClickAndCollect,
    calculateTotalPrice,
    orderType,
    message,
    items,
  } = useShoppingCart();

  const { calculOrderTimeRange } = useShop();

  const handleSubmit = async () => {
    setIsSubmitting(true);

    if (!cartItems.length) {
      // Check if cart is empty
      console.error("Aucune donnée dans le panier");
      setIsSubmitting(false);
      return;
    }

    if (!isClickAndCollect) {
      const dataToPrint = {
        orderType,
        ...(orderType === "dine-in" && { tableNumber }),
        items: items,
        specialInstructions: message,
        totalPrice: calculateTotalPrice(),
      };

      try {
        await axios.post(
          `${process.env.REACT_APP_API_URL}api/order`,
          dataToPrint
        );
      } catch (error) {
        console.error(
          "Erreur lors de l'envoi des données à l'API:",
          error.response?.data || error.message
        );
      }
    }

    setOrderTime(`${selectedDate.date} à ${selectedDate.time}`);
    handleOpenCompletedOrderModal();

    clearCart();
    if (isMobile) {
      setOpen(false);
    } else {
      setOpenCheckout(false);
    }
    setIsSubmitting(false);
    setMessage("");
    setSelectedDate({
      date: "Aujourd'hui",
      time: "",
    });
  };

  const handleCheckout = () => {
    if (selectedDay === "now") {
      setSelectedDate({ date: "Aujourd'hui", time: calculOrderTimeRange() });
    }
    if (!isAuthenticated) {
      handleOpenModal();
    } else {
      setOpenCheckout(true);
    }
  };

  const handleGuestCheckout = () => {
    setIsGuest(true);
    setOpenCheckout(true);
    handleCloseModal();
  };

  return (
    <div>
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          alignItems: "center",
          width: "100%",
          backgroundColor: "#fff",
          p: 2,
          filter: "drop-shadow(0 1px 4px rgba(0, 0, 0, .08))",
        }}
      >
        {cartItems.length > 0 && (
          <Box
            sx={{
              width: "100%",
              display: "flex",
              pb: 2,
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="h4">Total de la commande</Typography>
            </Box>
            <Box>
              <Typography variant="h4">
                {formatEuros(calculateTotalPrice() ?? 0)}
              </Typography>
            </Box>
          </Box>
        )}
        <Button
          variant="contained"
          fullWidth
          sx={{ py: 1.5 }}
          disabled={
            cartItems.length === 0 ||
            calculateTotalPrice() < 1 ||
            availableDates.length < 1
          }
          onClick={isClickAndCollect ? handleCheckout : handleSubmit}
        >
          {isClickAndCollect ? (
            "Finaliser la commande"
          ) : isSubmitting ? (
            <CircularProgress color="secondary" size={24.5} />
          ) : (
            "Finaliser la commande"
          )}
        </Button>
      </Box>
      <Drawer open={openCheckout} onClose={toggleDrawer(false)} anchor="right">
        <InsideDrawer toggleDrawer={toggleDrawer}>
          <CheckoutForm handleSubmit={handleSubmit} isGuest={isGuest} />
        </InsideDrawer>
      </Drawer>
      <Modal
        open={openModal}
        onClose={handleCloseModal}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={modalStyle}>
          <Typography id="modal-modal-title" variant="h3">
            Souhaite-vous vous identifier ?
          </Typography>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              mt: 2,
              gap: 1,
              alignItems: "center",
            }}
          >
            <FullWidthBtn
              handleAction={() => loginWithRedirect()}
              name={"S'identifier"}
            />

            <Link onClick={() => handleGuestCheckout()}>
              Continuer en tant qu'invité
            </Link>
          </Box>
        </Box>
      </Modal>
    </div>
  );
};

export default CartValidator;
