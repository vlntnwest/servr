import React, { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import Header from "../components/user/Header";
import { useDispatch, useSelector } from "react-redux";
import { getTable } from "../actions/table.action";
import { getDetails } from "../actions/details.action";
import { Alert, Box, CircularProgress, Container } from "@mui/material";
import Popular from "../components/user/Popular";
import MealCategory from "../components/user/MealCategory";
import { getMeals } from "../actions/meal.action";
import ShoppingCartProvider from "../components/Context/ShoppingCartContext";
import ShopProvider from "../components/Context/ShopContext";

const Table = () => {
  const dispatch = useDispatch();
  const { tableNumber } = useParams();
  const tableData = useSelector((state) => state.tableReducer);
  const [isTableOpen, setIsTableOpen] = useState(false);

  const types = ["bowl", "custom", "side", "dessert", "drink"];

  const [error, setError] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      try {
        await dispatch(getTable(tableNumber));
        await dispatch(getMeals());
        await dispatch(getDetails());
      } catch (error) {
        setError(
          error.response
            ? error.response.data.error
            : "Error fetching tables data"
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [dispatch, tableNumber]);

  useEffect(() => {
    setIsTableOpen(tableData.isOpen);
  }, [tableData]);

  if (isLoading) {
    return (
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100vh",
          justifyContent: "center",
        }}
      >
        <img
          src="https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg"
          alt="Pokey bar logo"
          style={{ width: "100%" }}
        />
        <CircularProgress />
      </Container>
    );
  }

  if (tableData.error) {
    return <Navigate to="/" />;
  }

  if (error) {
    return (
      <Container
        sx={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          height: "100vh",
          justifyContent: "center",
        }}
      >
        <img
          src="https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg"
          alt="Pokey Bar logo"
          style={{ width: "100%" }}
        />
        <Alert severity="error" sx={{ width: "100%" }}>
          Error: {error}
        </Alert>
      </Container>
    );
  }

  if (isTableOpen === false)
    return (
      <Container sx={{ alignContent: "center", height: "100vh" }}>
        <img
          src="https://g10afdaataaj4tkl.public.blob.vercel-storage.com/img/1Fichier-21.svg"
          alt="Pokey Bar logo"
          style={{ width: "100%" }}
        />
        <Alert severity="info">
          La table est fermé, demandez à Flo de l'ouvrir
        </Alert>
      </Container>
    );

  return (
    <ShopProvider>
      <ShoppingCartProvider>
        <Box
          style={{
            "&::WebkitScrollbar": {
              display: "none",
            },
            MsOverflowStyle: "none",
            scrollbarWidth: "none",
          }}
        >
          <Header />
          <Box component="main" maxWidth="lg" sx={{ margin: "0 auto" }}>
            <Popular />
            {types.map((type, index) => (
              <MealCategory type={type} key={index} />
            ))}
          </Box>
        </Box>
      </ShoppingCartProvider>
    </ShopProvider>
  );
};

export default Table;
