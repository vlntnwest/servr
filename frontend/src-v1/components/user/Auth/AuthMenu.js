import * as React from "react";
import { Drawer, IconButton } from "@mui/material";
import PersonIcon from "@mui/icons-material/Person";
import Navigation from "../Settings/Navigation";
import { useState } from "react";
import { Box } from "@mui/material";

export default function AuthMenu() {
  const [openDrawer, setOpenDrawer] = useState(false);

  const toggleDrawer = (newOpen) => () => {
    setOpenDrawer(newOpen);
  };

  return (
    <Box>
      <IconButton
        id="basic-button"
        onClick={toggleDrawer(true)}
        color="primary"
      >
        <PersonIcon />
      </IconButton>
      <Drawer open={openDrawer} onClose={toggleDrawer(false)} anchor="right">
        <Navigation toggleDrawer={toggleDrawer} />
      </Drawer>
    </Box>
  );
}
