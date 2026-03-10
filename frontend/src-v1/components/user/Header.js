import React, { useEffect, useState } from "react";
import { AppBar, Box, Drawer, IconButton, Toolbar } from "@mui/material";
import ShoppingBagOutlinedIcon from "@mui/icons-material/ShoppingBagOutlined";
import Badge from "@mui/material/Badge";
import Cart from "./Cart/Cart";
import { useShoppingCart } from "../Context/ShoppingCartContext";
import { useLocation } from "react-router-dom";
import AuthMenu from "./Auth/AuthMenu";

const Header = ({ auth }) => {
  const [open, setOpen] = useState(false);

  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };
  const [cartValue, setCartValue] = useState();
  const { cartItems } = useShoppingCart();
  const location = useLocation();

  const backHome = (e) => {
    e.preventDefault();
    if (location.pathname.includes("confirmation")) {
      window.location.href = "/";
    } else {
      return;
    }
  };

  useEffect(() => {
    let value = 0;
    for (let i = 0; i < cartItems.length; i++) {
      value += cartItems[i].quantity;
      setCartValue(value);
    }
  }, [cartItems]);

  return (
    <Box
      style={{
        position: "sticky",
        top: "0",
        borderBottom: "1px solid rgba(0,0,0,.08)",
        zIndex: 10,
      }}
    >
      <AppBar
        component="nav"
        style={{
          background: "#fff",
          boxShadow: "none",
          position: "sticky",
          top: "0",
        }}
      >
        <Toolbar>
          <Box sx={{ flexGrow: 1 }}>
            <Box
              style={{
                width: "100px",
                backgroundImage:
                  "url('https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg')",
                backgroundSize: "contain",
                backgroundRepeat: "no-repeat",
                textIndent: "-9999px",
              }}
              onClick={(e) => backHome(e)}
            >
              Pokey bar
            </Box>
          </Box>
          {cartItems.length > 0 ? (
            <IconButton
              onClick={toggleDrawer(true)}
              sx={{ display: { md: "none" } }}
            >
              <Badge badgeContent={cartValue} color="primary">
                <ShoppingBagOutlinedIcon />
              </Badge>
            </IconButton>
          ) : null}
          {auth ? <AuthMenu /> : null}
          <Drawer open={open} onClose={toggleDrawer(false)} anchor="bottom">
            <Cart setOpen={setOpen} />
          </Drawer>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default Header;
