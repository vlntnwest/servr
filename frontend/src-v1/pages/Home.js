import React from "react";
import { Container, Typography } from "@mui/material";

const Home = () => {
  return (
    <Container sx={{ alignContent: "center", height: "100vh" }}>
      <img
        src="https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg"
        alt="pokey logo"
        style={{ width: "100%" }}
      />
      <Typography variant="body1" textAlign={"center"}>
        Scannez le QR Code de la table pour continuer
      </Typography>
    </Container>
  );
};

export default Home;
