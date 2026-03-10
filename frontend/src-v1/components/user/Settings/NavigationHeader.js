import { AppBar, Box, IconButton, Toolbar, Typography } from "@mui/material";
import React from "react";
import CloseRoundedIcon from "@mui/icons-material/CloseRounded";
import ArrowBackIosNewRoundedIcon from "@mui/icons-material/ArrowBackIosNewRounded";

const NavigationHeader = ({ toggleDrawer, name, back }) => {
  return (
    <>
      <Box
        style={{
          position: "sticky",
          top: "0",
          filter: "drop-shadow(0 1px 4px rgba(0, 0, 0, .08))",
          zIndex: 10,
        }}
      >
        <AppBar
          component="nav"
          sx={{
            background: "#fff",
            boxShadow: "none",
            position: "sticky",
            top: "0",
          }}
        >
          <Toolbar sx={{ padding: "0 8px" }}>
            {name && (
              <Box
                sx={{
                  position: "absolute",
                  transform: "translateX(-50%)",
                  left: "50%",
                  textAlign: "center",
                }}
              >
                <Typography variant="body1" color="black">
                  {name}
                </Typography>
              </Box>
            )}
            <IconButton onClick={toggleDrawer(false)}>
              {back ? <ArrowBackIosNewRoundedIcon /> : <CloseRoundedIcon />}
            </IconButton>
          </Toolbar>
        </AppBar>
      </Box>
    </>
  );
};

export default NavigationHeader;
