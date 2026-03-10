import React from "react";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import Toolbar from "@mui/material/Toolbar";

import Button from "@mui/material/Button";
import { useAuth0 } from "@auth0/auth0-react";

const AdminHeader = () => {
  const { logout } = useAuth0();

  return (
    <Box sx={{ flexGrow: 1 }}>
      <AppBar position="static">
        <Toolbar>
          <Button color="inherit" onClick={logout}>
            Se déconnecter
          </Button>
        </Toolbar>
      </AppBar>
    </Box>
  );
};

export default AdminHeader;
