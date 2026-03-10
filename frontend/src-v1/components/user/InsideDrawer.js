import React from "react";
import NavigationHeader from "./Settings/NavigationHeader";
import { Box } from "@mui/material";

const InsideDrawer = ({ toggleDrawer, children, name, back }) => {
  return (
    <Box
      sx={{
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        width: { xs: "100vw", sm: "400px" },
      }}
    >
      <NavigationHeader
        toggleDrawer={toggleDrawer}
        name={name}
        back={back ?? null}
      />
      <Box
        py={2}
        sx={{
          flexGrow: "1",
          backgroundColor: "rgba(208, 208, 208, 0.12)",
          display: "flex",
          justifyContent: "center",
        }}
      >
        {children}
      </Box>
    </Box>
  );
};

export default InsideDrawer;
