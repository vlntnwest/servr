import React, { useState } from "react";
import {
  Box,
  Card,
  CardActionArea,
  CardContent,
  CardMedia,
  Typography,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";

import MealDetails from "../MealDetails";

const PopularCard = ({ meal }) => {
  const [openDrawer, setOpenDrawer] = useState(false);

  const toggleDrawer = (newOpen) => () => {
    setOpenDrawer(newOpen);
  };

  return (
    <>
      <Card
        sx={{
          display: "flex",
          flexDirection: "column",
          minWidth: 152,
          maxWidth: 152,
        }}
      >
        <CardActionArea
          sx={{ display: "flex", flexDirection: "column", flexGrow: 1 }}
          onClick={toggleDrawer(true)}
        >
          <CardMedia
            component="img"
            image={`https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/${meal.picture}.webp`}
            alt={meal.name}
            sx={{ aspectRatio: "1/1" }}
          />
          <CardContent
            sx={{
              display: "flex",
              flexDirection: "column",
              flexGrow: 1,
              px: 1,
              width: "100%",
            }}
          >
            <Box sx={{ flex: 1 }}>
              <Typography variant="h3" sx={{ flexGrow: 1 }}>
                {meal.name}
              </Typography>
              <Typography variant="body2" sx={{ marginTop: "auto" }}>
                {meal.price}€
              </Typography>
            </Box>
            <Box
              sx={{
                border: "1px solid rgba(0, 0, 0, 0.12)",
                borderRadius: "4px",
                color: "rgba(0, 0, 0, 0.26)",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                mt: 2,
                minHeight: "34px",
              }}
            >
              <AddIcon />
            </Box>
          </CardContent>
        </CardActionArea>
      </Card>
      <MealDetails
        meal={meal}
        openDrawer={openDrawer}
        toggleDrawer={toggleDrawer}
      />
    </>
  );
};

export default PopularCard;
