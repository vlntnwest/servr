import React, { useCallback, useEffect, useState } from "react";
import { CheckoutProvider } from "@stripe/react-stripe-js";
import axios from "axios";
import { loadStripe } from "@stripe/stripe-js";
import CheckoutContent from "./CheckoutContent";
import { CircularProgress, Drawer, TextField, Typography } from "@mui/material";
import { Box } from "@mui/system";
import { validateForm } from "../../../utils/";
import FullWidthBtn from "../../Buttons/FullWidthBtn";
import { useSelector } from "react-redux";
import { useGuest } from "../../Context/guestInfos";
import { useShoppingCart } from "../../Context/ShoppingCartContext";
import ConfidentialityPolicy from "../Legal/ConfidentialityPolicy";
import GeneralConditions from "../Legal/GeneralConditions";
import { Link } from "react-router-dom";
import InsideDrawer from "../InsideDrawer";
import useStripeItems from "../../../hooks/useStripeItems";

const stripe = loadStripe(process.env.REACT_APP_STRIPE_PUBLIC_KEY, {
  betas: ["custom_checkout_beta_5"],
});

const linkList = [
  {
    label: "Politique de confidentialité",
    component: `ConfidentialityPolicy`,
  },
  {
    label: "Conditions générales",
    component: "GeneralConditions",
  },
];

const componentMap = {
  ConfidentialityPolicy,
  GeneralConditions,
};

const CheckoutForm = ({ handleSubmit, isGuest }) => {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const ComponentToRender = componentMap[selectedItem?.component];

  const toggleDrawer = (newOpen, item = null) => {
    return () => {
      setOpen(newOpen);
      setSelectedItem(item);
    };
  };
  const [savedInfo, setSavedInfo] = useState(false);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [cartData, setCartData] = useState([]);

  const { guestInfos, setGuestInfos } = useGuest();

  const [errors, setErrors] = useState({
    firstName: false,
    email: false,
    phone: false,
  });

  const [errorMessages, setErrorMessages] = useState({
    firstName: "",
    email: "",
    phone: "",
  });

  const user = useSelector((state) => state.userReducer);

  const { message, selectedDate, items, orderType } = useShoppingCart();

  const { stripeItems, loading: stripeLoading } = useStripeItems(cartData);

  const createCheckoutSession = useCallback(
    async (email) => {
      const verifiedTotalPrice = () => {
        if (stripeItems.length < 1) {
          return;
        }

        const total = stripeItems.map((item) => {
          const elPrice = item.price_data.unit_amount * item.quantity;
          return elPrice;
        });
        return parseFloat(total.reduce((acc, curr) => acc + curr).toFixed(2));
      };

      const data = {
        userId: user._id ?? null,
        orderType,
        items: items,
        specialInstructions: message,
        orderDate: selectedDate,
        clientData: {
          name: user.firstName ?? guestInfos.firstName,
          email: user.email ?? guestInfos.email,
          phone: user.phone ?? guestInfos.phone,
        },
        totalPrice: verifiedTotalPrice(),
      };

      try {
        setLoading(true);
        const response = await axios.post(
          `${process.env.REACT_APP_API_URL}api/checkout/create-checkout-session`,
          { email, stripeItems, data }
        );
        setClientSecret(response.data.checkoutSessionClientSecret);
      } catch (error) {
        setError(`Erreur: ${error.message}`);
      } finally {
        setLoading(false);
      }
    },
    [
      stripeItems,
      guestInfos.email,
      guestInfos.firstName,
      guestInfos.phone,
      message,
      orderType,
      selectedDate,
      user._id,
      user.email,
      user.firstName,
      user.phone,
      items,
    ]
  );

  useEffect(() => {
    const storedCart = JSON.parse(sessionStorage.getItem("Cart")) || [];
    setCartData(storedCart);
  }, []);

  useEffect(() => {
    if (!isGuest && user?.email && stripeItems.length > 0 && !clientSecret) {
      createCheckoutSession(user.email);
    }
  }, [isGuest, user?.email, stripeItems, createCheckoutSession, clientSecret]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setGuestInfos((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const checkGuest = async (e) => {
    e.preventDefault();

    if (!validateForm(guestInfos, setErrors, setErrorMessages)) {
      return;
    }
    try {
      await createCheckoutSession(isGuest ? guestInfos.email : user.email);
    } catch (error) {
      console.error("Erreur lors de la création de la session :", error);
      setError(`Erreur: ${error.message}`);
    } finally {
      setSavedInfo(true);
    }
  };

  if (isGuest && !savedInfo) {
    return (
      <Box
        component={"form"}
        onSubmit={(e) => checkGuest(e)}
        sx={{
          px: 4,
          py: 2,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          width: "100%",
        }}
      >
        <TextField
          name="firstName"
          label="Prénom"
          required
          value={guestInfos.firstName}
          error={errors.firstName}
          helperText={errorMessages.firstName}
          sx={{ width: "100%", mb: 2 }}
          onChange={handleChange}
        />
        <TextField
          name="email"
          label="Email"
          required
          value={guestInfos.email}
          error={errors.email}
          helperText={errorMessages.email}
          sx={{ width: "100%", mb: 2 }}
          onChange={handleChange}
        />
        <TextField
          name="phone"
          label="Téléphone"
          required
          value={guestInfos.phone}
          error={errors.phone}
          helperText={errorMessages.phone}
          sx={{ width: "100%", mb: 2 }}
          onChange={handleChange}
        />
        <FullWidthBtn
          name={"Continuer"}
          handleAction={(e) => checkGuest(e)}
          isSubmitting={loading}
        />
        <Box pt={1}>
          <Typography
            variant="body2"
            sx={{
              textTransform: "none",
              color: "rgba(0, 0, 0, 0.6);",
              fontSize: "0.75rem",
            }}
          >
            En créant un compte, vous acceptez notre{" "}
            <Link onClick={toggleDrawer(true, linkList[0])}>
              {linkList[0].label}
            </Link>{" "}
            et nos{" "}
            <Link onClick={toggleDrawer(true, linkList[1])}>
              {linkList[1].label}
            </Link>
            .
          </Typography>
        </Box>
        <Drawer open={open} onClose={toggleDrawer(false)} anchor="bottom">
          <InsideDrawer toggleDrawer={toggleDrawer} name={selectedItem?.label}>
            {ComponentToRender ? (
              <ComponentToRender />
            ) : (
              <p>Contenu introuvable</p>
            )}
          </InsideDrawer>
        </Drawer>
      </Box>
    );
  }

  if (loading || stripeLoading) {
    return (
      <Box
        style={{
          width: "100vw",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return <div>Impossible de charger le formulaire de paiement: {error}</div>;
  }

  if (!clientSecret) {
    return <div>Impossible d'obtenir les informations de paiement.</div>;
  }

  if (clientSecret) {
    return (
      <CheckoutProvider stripe={stripe} options={{ clientSecret }}>
        <CheckoutContent handleSubmit={handleSubmit} />
      </CheckoutProvider>
    );
  } else {
    return null;
  }
};

export default CheckoutForm;
