import React from "react";
import Routes from "./components/Routes";

import { LocalizationProvider } from "@mui/x-date-pickers";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";

import { ThemeProvider, CssBaseline } from "@mui/material";
import theme from "./Theme";

const App = () => {
  return (
    <ThemeProvider theme={theme}>
      <LocalizationProvider dateAdapter={AdapterDayjs}>
        <CssBaseline />
        <Routes />
      </LocalizationProvider>
    </ThemeProvider>
  );
};
export default App;
