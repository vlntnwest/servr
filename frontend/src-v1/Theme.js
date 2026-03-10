// src/theme.js
import { createTheme } from "@mui/material/styles";

const theme = createTheme({
  palette: {
    primary: {
      main: "#1f4493",
    },
    secondary: {
      main: "#fff",
    },
    background: {
      default: "rgba(208, 208, 208, 0.12)",
    },
  },
  typography: {
    fontFamily: "Roboto Condensed",
    h1: {
      fontSize: 28,
      fontWeight: 700,
    },
    h2: {
      fontSize: 24,
      fontWeight: 700,
    },
    h3: {
      fontSize: 16,
      fontWeight: 700,
      marginBottom: 2,
    },
    h4: {
      fontSize: 14,
      fontWeight: 700,
    },
    body1: {
      fontSize: 14,
      fontWeight: 400,
      fontFamily: "sans-serif",
    },
    body2: {
      fontSize: 14,
      fontWeight: 400,
      fontFamily: "sans-serif",
      lineHeight: "19px",
    },
    p: {
      fontSize: 16,
      fontFamily: "Roboto Condensed",
    },
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: `
       @font-face {
        font-family: 'Roboto Condensed';
        src: url('/assets/fonts/RobotoCondensed-VariableFont_wght.ttf') format('truetype');
        unicodeRange: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+2000-206F, U+2074, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF;
      }
          html,
          body {
            html::-webkit-scrollbar,
            body::-webkit-scrollbar {
            display: none;
          }
          html {
            -ms-overflow-style: none; 
            scrollbar-width: none;  /* Firefox */
           }
           body {
            -ms-overflow-style: none; 
            scrollbar-width: none;
          }
      `,
    },
    MuiButton: {
      defaultProps: {
        variant: "contained",
        disableElevation: true,
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          border: "1px solid rgba(0, 0, 0, 0.05)",
          boxShadow: "none",
        },
      },
    },
    MuiTypography: {
      styleOverrides: {
        body2: {
          color: "#676767",
        },
      },
    },
  },
});

export default theme;
