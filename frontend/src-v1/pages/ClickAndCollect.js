import React, { useEffect, useState } from "react";
import Header from "../components/user/Header";
import { useDispatch, useSelector } from "react-redux";
import { getDetails } from "../actions/details.action";
import { Alert, Box, Container, Modal, Typography } from "@mui/material";
import Popular from "../components/user/Popular";
import MealCategory from "../components/user/MealCategory";
import { getMeals } from "../actions/meal.action";
import ShoppingCartProvider from "../components/Context/ShoppingCartContext";
import { useAuth0 } from "@auth0/auth0-react";
import { getUser } from "../actions/users.action";
import Onboarding from "../components/user/Onboarding/Onboarding";
import axios from "axios";
import ShopProvider, { useShop } from "../components/Context/ShopContext";
import CheckIcon from "../components/Icons/CheckIcon";
import { useMotionValue, motion } from "framer-motion";
import GuestProvider, { useGuest } from "../components/Context/guestInfos";
import { isEmpty } from "../components/Utils";
import Cart from "../components/user/Cart/Cart";

const ClickAndCollect = () => {
  const dispatch = useDispatch();
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0();
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;

  const [error, setError] = useState(false);

  const [isNewUser, setIsNewUser] = useState(false);

  const userData = useSelector((state) => state.userReducer);

  useEffect(() => {
    const handleAuthentication = async () => {
      if (!isAuthenticated || !user?.email) return;

      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: audience,
            scope: "read:current_user read:users_app_metadata",
          },
        });

        const result = await dispatch(getUser(user.email, token));

        if (!result.success) {
          await createNewUser(token, user.email);
          setIsNewUser(true);
        }
      } catch (err) {
        console.error("Erreur lors de l'authentification", err);
      }
    };

    const createNewUser = async (token, email) => {
      const firstName = user.given_name;
      const lastName = user.family_name;

      try {
        await axios.post(
          `${process.env.REACT_APP_API_URL}api/users`,
          { email, firstName, lastName },
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        await dispatch(getUser(email, token));
      } catch (err) {
        console.error("Erreur lors de la création de l'utilisateur", err);
      }
    };

    handleAuthentication();
  }, [isAuthenticated, user, dispatch, getAccessTokenSilently, audience]);

  useEffect(() => {
    const fetchMeals = async () => {
      try {
        await dispatch(getMeals());
      } catch (error) {
        setError(
          error.response
            ? error.response.data.error
            : "Error fetching meals data"
        );
      }
    };

    fetchMeals();
  }, [dispatch]);

  useEffect(() => {
    const fetchDetails = async () => {
      try {
        await dispatch(getDetails());
      } catch (error) {
        setError(
          error.response
            ? error.response.data.error
            : "Error fetching details data"
        );
      }
    };

    fetchDetails();
  }, [dispatch]);

  if (error) {
    return (
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100vh",
          justifyContent: "center",
        }}
      >
        <Box sx={{ maxWidth: 400 }}>
          <img
            src="https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg"
            alt="Pokey Bar logo"
            style={{ width: "100%", margin: "0 0 16px 0" }}
          />
          <Alert severity="error" sx={{ width: "100%" }}>
            Error: {error}
          </Alert>
        </Box>
      </Container>
    );
  }

  if (
    (isNewUser === true && isAuthenticated) ||
    (isAuthenticated && userData?.shouldGiveInformation === true)
  ) {
    return <Onboarding setIsNewUser={setIsNewUser} />;
  }

  return (
    <ShopProvider>
      <ShoppingCartProvider>
        <GuestProvider>
          <TableContent />
        </GuestProvider>
      </ShoppingCartProvider>
    </ShopProvider>
  );
};

export default ClickAndCollect;

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
  textAlign: "center",
};

const TableContent = () => {
  const { isMobile } = useShop();
  const { orderCompleted, handleCloseCompletedOrderModal, orderTime } =
    useShop();

  const { guestInfos } = useGuest();
  const user = useSelector((state) => state.userReducer);

  const types = ["bowl", "custom", "side", "dessert", "drink"];

  let progress = useMotionValue(90);

  return (
    <Box>
      <Box
        style={{
          "&::WebkitScrollbar": {
            display: "none",
          },
          MsOverflowStyle: "none",
          scrollbarWidth: "none",
        }}
      >
        <Header auth />
        <Box
          component="main"
          sx={{
            display: "grid",
            gridTemplateColumns: {
              sm: "100%",
              md: "minmax(50%, 60%) minmax(420px, 1fr)",
              lg: "minmax(60%, 70%) minmax(420px, 1fr)",
              xl: "minmax(60%, 70%) minmax(420px, 1fr)",
            },
            margin: "0 auto",
          }}
          maxWidth="xl"
        >
          <Box sx={{ maxWidth: "100vw" }}>
            <Popular />
            {types.map((type, index) => (
              <MealCategory type={type} key={index} />
            ))}
          </Box>
          {!isMobile && (
            <Box
              sx={{
                position: "sticky",
                top: 65,
                height: "calc(100vh - 65px)",
                padding: "16px 16px 16px 0",
              }}
            >
              <Cart />
            </Box>
          )}
        </Box>
      </Box>
      <Modal
        open={orderCompleted}
        onClose={handleCloseCompletedOrderModal}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={modalStyle}>
          <Box sx={{ display: "flex", justifyContent: "center", mb: 2 }}>
            <motion.div
              initial={{ x: 0 }}
              animate={{ x: 100 }}
              style={{ x: progress }}
              transition={{ duration: 1 }}
            />
            <CheckIcon progress={progress} />
          </Box>
          <Typography id="modal-modal-title" variant="h6" component="h6">
            Commande validé
          </Typography>
          <Typography id="modal-modal-description" sx={{ mt: 2 }}>
            Merci pour votre commande,{" "}
            {isEmpty(guestInfos.firstName)
              ? user.firstName
              : guestInfos.firstName}
            !
          </Typography>
          <Typography id="modal-modal-description" sx={{ mt: 2 }}>
            Vous pouvez venir la récupérer:
            <br />
            {orderTime}
          </Typography>
        </Box>
      </Modal>
    </Box>
  );
};
