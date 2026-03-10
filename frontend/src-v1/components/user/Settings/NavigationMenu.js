import { Box, Button, Card, Divider, Link, Typography } from "@mui/material";
import React from "react";
import NavigationItem from "./NavigationItem";
import { useAuth0 } from "@auth0/auth0-react";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";

const NavigationMenu = () => {
  const { logout, isAuthenticated, loginWithRedirect } = useAuth0();

  const menuItems = [
    { label: "Détails du compte", component: "AccountDetails" },
    { label: "Historique de commandes", component: "OrdersList" },
    { label: "À propos", component: "About" },
  ];

  return (
    <Box
      px={2}
      sx={{
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <Card sx={{ bgcolor: "background.paper" }}>
        {isAuthenticated ? (
          menuItems.map((menuItem, index) => (
            <NavigationItem
              key={index}
              menuItem={menuItem}
              isLast={index === menuItems.length - 1}
            />
          ))
        ) : (
          <>
            <Button
              color="secondary"
              disableElevation
              fullWidth
              sx={{
                p: 0,
                display: "block",
              }}
              onClick={loginWithRedirect}
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
                    py: 1.5,
                    pl: 2,
                    pr: 2,
                    mr: "auto",
                    alignItems: "flex-start",
                  }}
                >
                  <Typography
                    sx={{
                      textAlign: "left",
                      fontWeight: "400",
                      textTransform: "none",
                    }}
                  >
                    Se connecter
                  </Typography>
                </Box>
                <Box sx={{ ml: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      px: 2,
                      py: 1.5,
                      alignItems: "center",
                    }}
                  >
                    <ArrowForwardIosRoundedIcon
                      sx={{ ml: 1, maxHeight: "21px" }}
                      color="primary"
                    />
                  </Box>
                </Box>
              </Box>
            </Button>
            <Divider variant="middle" sx={{ borderColor: "#0000000a" }} />
            <Button
              color="secondary"
              disableElevation
              fullWidth
              sx={{
                p: 0,
                display: "block",
              }}
              onClick={() =>
                loginWithRedirect({
                  authorizationParams: { screen_hint: "signup" },
                })
              }
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
                    py: 1.5,
                    pl: 2,
                    pr: 2,
                    mr: "auto",
                    alignItems: "flex-start",
                  }}
                >
                  <Typography
                    sx={{
                      textAlign: "left",
                      fontWeight: "400",
                      textTransform: "none",
                    }}
                  >
                    S'inscrire
                  </Typography>
                </Box>
                <Box sx={{ ml: 2 }}>
                  <Box
                    sx={{
                      display: "flex",
                      px: 2,
                      py: 1.5,
                      alignItems: "center",
                    }}
                  >
                    <ArrowForwardIosRoundedIcon
                      sx={{ ml: 1, maxHeight: "21px" }}
                      color="primary"
                    />
                  </Box>
                </Box>
              </Box>
            </Button>
            <Divider variant="middle" sx={{ borderColor: "#0000000a" }} />
            <NavigationItem key={0} menuItem={menuItems[2]} isLast={true} />
          </>
        )}
      </Card>
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {isAuthenticated && (
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
        )}
      </Box>
    </Box>
  );
};

export default NavigationMenu;
