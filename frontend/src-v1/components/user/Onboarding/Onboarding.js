import {
  Box,
  Button,
  Drawer,
  Link,
  TextField,
  Typography,
} from "@mui/material";
import React, { useEffect, useState } from "react";
import { useAuth0 } from "@auth0/auth0-react";
import { useDispatch, useSelector } from "react-redux";
import { editUser, getUser } from "../../../actions/users.action";
import { validateField } from "../../../utils";
import InsideDrawer from "../InsideDrawer";
import ConfidentialityPolicy from "../Legal/ConfidentialityPolicy";
import GeneralConditions from "../Legal/GeneralConditions";

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

const Onboarding = ({ setIsNewUser }) => {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const ComponentToRender = componentMap[selectedItem?.component];

  const toggleDrawer = (newOpen, item = null) => {
    return () => {
      setOpen(newOpen);
      setSelectedItem(item);
    };
  };
  const userData = useSelector((state) => state.userReducer);
  const dispatch = useDispatch();

  const [formData, setFormData] = useState({
    firstName: userData.firstName || "",
    lastName: userData.lastName || "",
    phone: userData.phone || "",
  });

  const [errors, setErrors] = useState({
    firstName: false,
    lastName: false,
    phone: false,
  });

  const [errorMessages, setErrorMessages] = useState({
    firstName: "",
    lastName: "",
    phone: "",
  });

  const { getAccessTokenSilently, user, logout } = useAuth0();
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const token = await getAccessTokenSilently({
          authorizationParams: {
            audience: audience,
            scope: "read:current_user read:users_app_metadata",
          },
        });
        dispatch(getUser(user.email, token));
      } catch (err) {
        console.error("Erreur lors de la récupération du token", err);
      }
    };
    fetchUser();
  }, [user.email, dispatch, getAccessTokenSilently, audience]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const validateForm = () => {
    let isValid = true;
    const newErrors = {};
    const newErrorMessages = {};

    Object.keys(formData).forEach((field) => {
      const { isValid: fieldIsValid, message } = validateField(
        field,
        formData[field]
      );
      newErrors[field] = !fieldIsValid;
      newErrorMessages[field] = message;
      if (!fieldIsValid) isValid = false;
    });

    setErrors(newErrors);
    setErrorMessages(newErrorMessages);
    return isValid;
  };

  const handleEdit = async (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: audience,
          scope: "read:current_user read:users_app_metadata",
        },
      });
      const dataToSend = { ...formData, shouldGiveInformation: false };
      dispatch(editUser(dataToSend, userData._id, token));
      setIsNewUser(false);
    } catch (err) {
      console.error("Erreur lors de la récupération du token", err);
    }
  };

  return (
    <Box
      sx={{
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        pt: 6,
        pb: 2,
      }}
    >
      <Box>
        <Box sx={{ mb: 3 }}>
          <Box
            component="img"
            sx={{
              display: "block",
              width: 240,
              margin: "24px auto",
            }}
            alt="The house from the offer."
            src="https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg"
          />
          <Typography
            variant="h2"
            sx={{ textAlign: "center", fontWeight: 400 }}
          >
            Bienvenue
          </Typography>
          <Typography
            variant="body1"
            sx={{ textAlign: "center", fontWeight: 400 }}
          >
            Dites nous en plus à propos de vous.
          </Typography>
        </Box>
        <Box
          sx={{
            px: 4,
            py: 2,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
          }}
        >
          <Box sx={{ mb: 2, maxWidth: 400 }}>
            <TextField
              name="firstName"
              label="Prénom"
              required
              value={formData.firstName}
              error={errors.firstName}
              helperText={errorMessages.firstName}
              sx={{ width: "100%", mb: 2 }}
              onChange={handleChange}
            />
            <TextField
              name="lastName"
              label="Nom"
              required
              value={formData.lastName}
              error={errors.lastName}
              helperText={errorMessages.lastName}
              sx={{ width: "100%", mb: 2 }}
              onChange={handleChange}
            />
            <TextField
              name="phone"
              label="Téléphone"
              required
              value={formData.phone}
              error={errors.phone}
              helperText={errorMessages.phone}
              sx={{ width: "100%", mb: 2 }}
              onChange={handleChange}
            />
            <Button
              sx={{
                width: "100%",
                padding: "16.5px 14px",
                lineHeight: "1.4375em",
              }}
              onClick={handleEdit}
            >
              Continuer
            </Button>
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
          </Box>
        </Box>
      </Box>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <Link
          sx={{
            textTransform: "none",
            color: "rgba(0, 0, 0, 0.6);",
            fontSize: "0.75rem",
            fontWeight: "400",
            textDecoration: "underline",
          }}
          onClick={logout}
        >
          Se déconnecter
        </Link>
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
};

export default Onboarding;
