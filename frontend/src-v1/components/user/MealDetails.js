import React, { useEffect, useState } from "react";
import MealDisplay from "./MealDisplay";
import CompositionValidator from "./CompositionValidator";
import { useShoppingCart } from "../Context/ShoppingCartContext";
import { formatPrice, isEmpty } from "../Utils";
import { useSelector } from "react-redux";
import axios from "axios";
import { Box, Dialog, Drawer } from "@mui/material";
import { useShop } from "../Context/ShopContext";

const MealDetails = ({ meal, openDrawer, toggleDrawer }) => {
  const { isMobile } = useShop();
  const [isLoading, setIsLoading] = useState(false);
  const { addToCart } = useShoppingCart();

  const { name, price, type, _id } = meal;
  const currentDate = new Date();
  const timestamp = currentDate.getTime();
  const [selectedBase, setSelectedBase] = useState();
  const [selectedProt, setSelectedProt] = useState([]);
  const [selectedGarnishes, setSelectedGarnishes] = useState([]);
  const [selectedToppings, setSelectedToppings] = useState([]);
  const [selectedSauces, setSelectedSauces] = useState([]);
  const [selectedProtSup, setSelectedProtSup] = useState([]);
  const [selectedSide, setSelectedSide] = useState([]);
  const [count, setCount] = useState(1);
  const [addSideCounts, setAddSideCounts] = useState({});
  const [proteinPrices, setProteinPrices] = useState({});

  const mealsData = useSelector((state) => state.mealReducer);
  const sidePrices = !isEmpty(mealsData)
    ? mealsData.filter((meal) => meal.type === "side")
    : [];

  useEffect(() => {
    const fetchCustomItems = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}api/item/custom/proteins`
        );

        const proteins = response.data.reduce((acc, item) => {
          acc[item.name] = item.price.replace(",", ".");
          return acc;
        }, {});

        setProteinPrices(proteins);
      } catch (err) {
        console.error("Error fetching custom items:", err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomItems();
  }, []);

  useEffect(() => {
    if (!openDrawer) {
      resetState();
    }
  }, [openDrawer]);

  const resetState = () => {
    setSelectedBase(null);
    setSelectedProt([]);
    setSelectedGarnishes([]);
    setSelectedToppings([]);
    setSelectedSauces([]);
    setSelectedProtSup([]);
    setCount(1);
    setSelectedSide([]);
    setAddSideCounts({});
    setIsLoading(false);
  };

  const isSauceDisabled = selectedSauces.length >= 2;
  const isGarnisheDisabled = selectedGarnishes.length >= 4;
  const isToppingsDisabled = selectedToppings.length >= 2;
  const isSupProtDisabled = selectedProtSup.length >= 1;

  const isAddButtonDisabled = () => {
    if (type === "bowl") {
      return !selectedBase || selectedSauces.length === 0;
    } else if (type === "side") {
      return selectedSauces.length === 0;
    } else if (type === "custom") {
      return (
        !selectedBase ||
        selectedSauces.length === 0 ||
        selectedGarnishes === 0 ||
        selectedToppings === 0
      );
    } else return false;
  };

  const calculateTotalPrice = () => {
    let totalPrice = formatPrice(price);

    selectedSide.forEach((side) => {
      if (side) {
        const getPrice = (sideName) => {
          const item = sidePrices.find(
            (sideItem) => sideItem.name === sideName
          );
          if (!item) {
            console.log(`Prix non trouvé pour: ${sideName}`);
            return null;
          }
          return item.price;
        };

        const sidePrice = getPrice(side[0]);

        if (sidePrice) {
          totalPrice += formatPrice(sidePrice) * side[2];
        }
      }
    });

    selectedProtSup.forEach((protein) => {
      totalPrice += formatPrice(proteinPrices[protein]);
    });

    totalPrice *= count;

    return totalPrice;
  };

  const sendToCart = () => {
    setIsLoading(true);

    const item = {
      id: `${_id}-${Math.floor(Math.random() * timestamp)}`,
      product_id: _id,
      type,
      name,
      base: selectedBase,
      proteins: selectedProt,
      garnishes: selectedGarnishes,
      toppings: selectedToppings,
      sauces: selectedSauces || [],
      extraProtein: selectedProtSup,
      extraProteinPrice: proteinPrices[selectedProtSup],
      quantity: count,
      price,
    };

    const sides = [];

    selectedSide.forEach((sideArray) => {
      const item = sidePrices.find(
        (sideItem) => sideItem.name === sideArray[0]
      );
      const side = {
        id: `${_id}-${Math.floor(Math.random() * timestamp)}-side`,
        type: "side",
        name: sideArray[0],
        sauces: sideArray[1] ? [sideArray[1]] : [],
        quantity: count,
        price: item.price,
      };
      sides.push(side);
    });

    addToCart(item);
    sides.forEach((side) => addToCart(side));

    setIsLoading(true);
    toggleDrawer(false)();
  };

  const handlers = {
    handleBaseChange: (value) => setSelectedBase(value),
    handleProtChange: (value) => setSelectedProt(value),
    handleSauceChange: (sauce) => {
      if (selectedSauces.includes(sauce)) {
        setSelectedSauces(selectedSauces.filter((s) => s !== sauce));
      } else if (selectedSauces.length < 2) {
        setSelectedSauces([...selectedSauces, sauce]);
      }
    },
    handleGarnishesChange: (garnishe) => {
      if (selectedGarnishes.includes(garnishe)) {
        setSelectedGarnishes(selectedGarnishes.filter((s) => s !== garnishe));
      } else if (selectedGarnishes.length < 4) {
        setSelectedGarnishes([...selectedGarnishes, garnishe]);
      }
    },
    handleToppingsChange: (topping) => {
      if (selectedToppings.includes(topping)) {
        setSelectedToppings(selectedToppings.filter((s) => s !== topping));
      } else if (selectedToppings.length < 4) {
        setSelectedToppings([...selectedToppings, topping]);
      }
    },
    handleProtSupChange: (prot) => {
      if (selectedProtSup.includes(prot)) {
        setSelectedProtSup(selectedProtSup.filter((s) => s !== prot));
      } else if (selectedProtSup.length < 1) {
        setSelectedProtSup([...selectedProtSup, prot]);
      }
    },
    handleSideChange: (side, count, sauce) => {
      // Met à jour le compteur
      setAddSideCounts((prevCounts) => ({
        ...prevCounts,
        [side]: count,
      }));

      // Met à jour le tableau selectedSide
      setSelectedSide((prev) => {
        const existingSideIndex = prev.findIndex((s) => s[0] === side);

        if (count === 0) {
          // Si le count est 0, supprimer l'entrée du tableau
          return prev.filter((s) => s[0] !== side);
        }

        if (existingSideIndex !== -1) {
          // Si le side existe déjà, le remplacer
          const updatedSides = [...prev];
          updatedSides[existingSideIndex] = [side, sauce, count]; // Remplace l'ancienne entrée
          return updatedSides; // Retourne le tableau mis à jour
        } else {
          // Si le side n'existe pas, on l'ajoute
          return [...prev, [side, sauce, count]];
        }
      });
    },
    handleIncrement: () => setCount((prev) => prev + 1),
    handleDecrement: () => setCount((prev) => (prev > 1 ? prev - 1 : prev)),
  };

  const options = {
    selectedBase,
    selectedProt,
    selectedGarnishes,
    selectedToppings,
    selectedSauces,
    selectedProtSup,
    addSideCounts,
    isGarnisheDisabled,
    isToppingsDisabled,
    isSauceDisabled,
    isSupProtDisabled,
  };

  const content = (
    <>
      <MealDisplay
        meal={meal}
        options={options}
        handlers={handlers}
        toggleDrawer={toggleDrawer}
      />
      <CompositionValidator
        count={count}
        handleIncrement={handlers.handleIncrement}
        handleDecrement={handlers.handleDecrement}
        isAddButtonDisabled={isAddButtonDisabled()}
        sendToCart={sendToCart}
        isLoading={isLoading}
        calculateTotalPrice={calculateTotalPrice}
      />
    </>
  );

  return isMobile ? (
    <Drawer open={openDrawer} onClose={toggleDrawer(false)} anchor="bottom">
      <Box sx={{ height: "100dvh", display: "flex", flexDirection: "column" }}>
        {content}
      </Box>
    </Drawer>
  ) : (
    <Dialog
      open={openDrawer}
      onClose={toggleDrawer(false)}
      maxWidth="sm"
      fullWidth
    >
      <Box
        sx={{
          display: "flex",
          flexDirection: "column",
          maxHeight: "calc(100dvh - 64px)",
        }}
      >
        {content}
      </Box>
    </Dialog>
  );
};

export default MealDetails;
