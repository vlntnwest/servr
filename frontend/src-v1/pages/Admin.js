import React, { useEffect, useState } from "react";
import AdminHeader from "../components/admin/adminComponents/AdminHeader";
import Tabs from "../components/admin/adminComponents/Tabs";
import { useAuth0 } from "@auth0/auth0-react";
import { jwtDecode } from "jwt-decode";
import { Box, CircularProgress, IconButton } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import { useDispatch } from "react-redux";
import { getFoods } from "../actions/food.action";

const Admin = () => {
  const {
    getAccessTokenSilently,
    isAuthenticated,
    loginWithRedirect,
    isLoading,
  } = useAuth0();

  const dispatch = useDispatch();

  const [userRoles, setUserRoles] = useState([]);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (isAuthenticated) {
        try {
          const token = await getAccessTokenSilently();
          const decodedToken = jwtDecode(token);
          const roles = decodedToken["https://app.pokey-bar.fr/roles"] || [];
          setUserRoles(roles);
        } catch (error) {
          console.error("Erreur lors de la récupération des rôles :", error);
        }
      }
    };

    fetchUserRole();
  }, [isAuthenticated, getAccessTokenSilently]);

  useEffect(() => {
    const fetchFood = async () => {
      if (isAuthenticated) {
        try {
          await dispatch(getFoods());
        } catch (error) {
          console.log("Erreur lors de la récupération des plats :", error);
        }
      }
    };
    fetchFood();
  }, [isAuthenticated, dispatch]);

  if (isLoading) {
    return (
      <Box
        style={{
          width: "100vw",
          height: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (isAuthenticated && userRoles.includes("Admin")) {
    return (
      <div>
        <AdminHeader />
        <Tabs />
      </div>
    );
  }

  return (
    <IconButton
      sx={{
        position: "absolute",
        top: "50%",
        left: "50%",
        transform: "translate(-50%, -50%)",
      }}
      onClick={() =>
        loginWithRedirect({ redirectUri: window.location.origin + "/admin" })
      }
      color="primary"
    >
      <PersonIcon />
    </IconButton>
  );
};

export default Admin;
