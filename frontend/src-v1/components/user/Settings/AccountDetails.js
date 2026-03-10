import React, { useState } from "react";
import { Box, Button, Link, Modal, TextField, Typography } from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { deleteUser, editUser } from "../../../actions/users.action";
import { useAuth0 } from "@auth0/auth0-react";
import FullWidthBtn from "../../Buttons/FullWidthBtn";
import axios from "axios";

const style = {
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

const AccountDetails = () => {
  const userData = useSelector((state) => state.userReducer);
  const dispatch = useDispatch();
  const { getAccessTokenSilently, user } = useAuth0();
  const audience = process.env.REACT_APP_AUTH0_AUDIENCE;

  const [open, setOpen] = useState(false);
  const handleOpen = () => {
    setOpen(true);
  };
  const handleClose = () => setOpen(false);

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

  const validateField = (name, value) => {
    let isValid = true;
    let message = "";

    switch (name) {
      case "firstName":
        if (!value.trim()) {
          isValid = false;
          message = "Le prénom est requis";
        }
        break;

      case "lastName":
        if (!value.trim()) {
          isValid = false;
          message = "Le nom est requis";
        }
        break;

      case "phone":
        const phoneRegex = /^(?:(?:\+|00)33|0)\s*[1-9](?:[\s.-]*\d{2}){4}$/;
        if (!value.trim()) {
          isValid = false;
          message = "Le numéro de téléphone est requis";
        } else if (!phoneRegex.test(value)) {
          isValid = false;
          message = "Format de numéro de téléphone invalide";
        }
        break;

      default:
        break;
    }

    return { isValid, message };
  };

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
      dispatch(editUser(formData, userData._id, token));
    } catch (err) {
      console.error("Erreur lors de la récupération du token", err);
    }
  };

  const handleDelete = async (e) => {
    e.preventDefault();

    try {
      const token = await getAccessTokenSilently({
        authorizationParams: {
          audience: audience,
          scope: "read:current_user read:users_app_metadata delete:users",
        },
      });

      await axios
        .delete(
          `${process.env.REACT_APP_API_URL}api/users/${userData._id}/${user.sub}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        )
        .then(() => {
          console.log(`Utilisateur ${user.sub} supprimé`);
        })
        .catch((err) => {
          console.log(err);
        });

      dispatch(deleteUser(userData._id, token));
      window.location = "/";
    } catch (err) {
      console.error("Erreur lors de la récupération du token", err);
    }
  };

  return (
    <Box
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
      }}
      pb={2}
    >
      <Box
        sx={{
          backgroundColor: "white",
          borderTop: "1px solid rgba(0, 0, 0, 0.05)",
          borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
          width: "100%",
        }}
        px={2}
        py={2}
        mb={2}
      >
        <TextField
          name="firstName"
          label="Prénom"
          required
          value={formData.firstName}
          error={errors.firstName}
          helperText={errorMessages.firstName}
          variant="standard"
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
          variant="standard"
          sx={{ width: "100%", mb: 2 }}
          onChange={handleChange}
        />
        <TextField
          name="phone"
          label="Numéro de téléphone"
          required
          value={formData.phone}
          error={errors.phone}
          helperText={errorMessages.phone}
          variant="standard"
          sx={{ width: "100%", mb: 2 }}
          onChange={handleChange}
        />
        <TextField
          label="Email"
          defaultValue={userData.email}
          variant="standard"
          helperText="Contacté le restaurant pour changer votre email"
          sx={{ width: "100%" }}
          slotProps={{
            input: {
              readOnly: true,
            },
          }}
        />
      </Box>
      <Box>
        <FullWidthBtn handleAction={handleEdit} name={"Enregistrer"} br0 />
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
            onClick={handleOpen}
            mt={1}
          >
            Supprimer le compte
          </Link>
          <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="modal-modal-title"
            aria-describedby="modal-modal-description"
          >
            <Box sx={style}>
              <Box sx={{ mb: 3 }}>
                <Typography id="modal-modal-title" variant="h6" component="h2">
                  Supprimer votre compte ?
                </Typography>
                <Typography
                  id="modal-modal-description"
                  variant="body1"
                  sx={{ mt: 1, fontWeight: 400 }}
                >
                  Êtes-vous sûr de vouloir supprimer votre compte ? Cette action
                  est irréversible et toutes vos données seront perdues.
                </Typography>
              </Box>
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "flex-end",
                  gap: "16px",
                }}
              >
                <Button variant="text" onClick={handleClose}>
                  Annuler
                </Button>
                <Button
                  variant="contained"
                  color="error"
                  onClick={handleDelete}
                >
                  Supprimer
                </Button>
              </Box>
            </Box>
          </Modal>
        </Box>
      </Box>
    </Box>
  );
};

export default AccountDetails;
