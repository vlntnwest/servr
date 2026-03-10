import { Typography } from "@mui/material";
import React from "react";
import BowlItem from "./BowlItem";
import CustomBowlItem from "./CustomBowltem";
import SideItem from "./SideItem";
import DrinkItem from "./DrinkItem";
import DessertItem from "./DessertItem";

const ItemList = ({ item }) => {
  const { type } = item;

  switch (type) {
    case "bowl":
      return <BowlItem {...item} />;
    case "custom":
      return <CustomBowlItem {...item} />;
    case "side":
      return <SideItem {...item} />;
    case "drink":
      return <DrinkItem {...item} />;
    case "dessert":
      return <DessertItem {...item} />;
    default:
      return (
        <Typography variant="body1">Type de commande non reconnu</Typography>
      );
  }
};

export default ItemList;
