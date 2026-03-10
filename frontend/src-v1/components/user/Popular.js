import { Box, Skeleton, Typography } from "@mui/material";
import React from "react";
import PopularCard from "./Card/PopularCard";
import { useSelector } from "react-redux";
import { isEmpty } from "../Utils";

const Popular = () => {
  const mealsData = useSelector((state) => state.mealReducer);

  const isLoading = isEmpty(mealsData);
  const popularMeal = !isLoading
    ? mealsData.filter((meal) => meal.isPopular === true)
    : [];

  return (
    <Box>
      <Typography variant="h2" m={2}>
        {isLoading ? (
          <Skeleton variant="text" width="40%" height={40} />
        ) : (
          "Populaire"
        )}
      </Typography>
      <Box
        sx={{
          display: "flex",
          gap: 1,
          pl: 2,
          pr: 2,
          overflow: "auto",
          width: "100%",
          scrollSnapType: "x mandatory",
          "& > *": {
            scrollSnapAlign: "center",
          },
          "::-webkit-scrollbar": { display: "none" },
        }}
      >
        {isLoading
          ? Array.from({ length: 5 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                width="150px"
                height="242px"
                sx={{ borderRadius: 2, flexShrink: 0 }}
              />
            ))
          : popularMeal.map((meal, index) => (
              <PopularCard key={index} meal={meal} />
            ))}
      </Box>
    </Box>
  );
};

export default Popular;
