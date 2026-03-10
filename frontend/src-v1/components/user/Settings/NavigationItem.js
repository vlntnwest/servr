import React, { useState } from "react";
import { Box, Button, Divider, Drawer, Typography } from "@mui/material";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import AccountDetails from "./AccountDetails";
import OrdersList from "./OrdersList";
import InsideDrawer from "../InsideDrawer";
import About from "./About";

const componentMap = {
  AccountDetails,
  OrdersList,
  About,
};

const NavigationItem = ({ menuItem, isLast }) => {
  const [open, setOpen] = useState(false);
  const toggleDrawer = (newOpen) => () => setOpen(newOpen);

  const ComponentToRender = componentMap[menuItem.component];

  return (
    <>
      <Button
        color="secondary"
        disableElevation
        fullWidth
        sx={{
          p: 0,
          display: "block",
        }}
        onClick={toggleDrawer(true)}
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
              {menuItem.label}
            </Typography>
          </Box>
          <Box sx={{ ml: 2 }}>
            <Box sx={{ display: "flex", px: 2, py: 1.5, alignItems: "center" }}>
              <ArrowForwardIosRoundedIcon
                sx={{ ml: 1, maxHeight: "21px" }}
                color="primary"
              />
            </Box>
          </Box>
        </Box>
      </Button>
      {!isLast && (
        <Divider variant="middle" sx={{ borderColor: "#0000000a" }} />
      )}
      <Drawer
        open={open}
        onClose={toggleDrawer(false)}
        anchor="right"
        hideBackdrop
      >
        <InsideDrawer toggleDrawer={toggleDrawer} name={menuItem.label} back>
          {ComponentToRender && <ComponentToRender />}
        </InsideDrawer>
      </Drawer>
    </>
  );
};

export default NavigationItem;
