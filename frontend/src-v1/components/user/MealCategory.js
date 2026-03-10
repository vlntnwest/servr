import { Box, Typography } from "@mui/material";
import React from "react";
import CategoryMealCard from "./Card/CategoryMealCard";
import { useSelector } from "react-redux";
import { isEmpty } from "../Utils";
import { Skeleton } from "@mui/material";

const MealCategory = ({ type }) => {
  const mealsData = useSelector((state) => state.mealReducer);
  const detailsData = useSelector((state) => state.detailsReducer);

  const isLoading = isEmpty(detailsData);

  const sortedMeals = !isEmpty(mealsData)
    ? mealsData.filter((meal) => meal.type === type)
    : [];

  const sortedDetails = !isEmpty(detailsData)
    ? detailsData.filter((detail) => detail.type === type)
    : [];

  const details =
    sortedDetails.length > 0
      ? sortedDetails[0]
      : {
          title: "Titre non trouvé",
          description: "Description non trouvée.",
        };

  return (
    <Box mt={3}>
      <Box m={2} mt={0}>
        {isLoading ? (
          <>
            <Skeleton variant="text" width="40%" height={40} />
            <Skeleton variant="text" width="60%" height={20} />
          </>
        ) : (
          <>
            <Typography variant="h2">{details.title}</Typography>
            <Typography variant="body2" sx={{ fontSize: 16 }}>
              {details.description}
            </Typography>
          </>
        )}
      </Box>
      <Box
        sx={{
          display: "grid",
          gap: { sm: 0, md: 1 },
          gridTemplateColumns: {
            md: "1fr",
            lg: "repeat(2, 1fr)",
          },
          px: { sm: 0, md: 2 },
        }}
      >
        {isLoading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Skeleton
                key={index}
                variant="rectangular"
                width="100%"
                height={132}
                sx={{ borderRadius: 2, flexShrink: 0, mb: 0.5 }}
              />
            ))
          : sortedMeals.map((meal, index) => (
              <CategoryMealCard key={index} meal={meal} />
            ))}
      </Box>
    </Box>
  );
};

export default MealCategory;
