import React, { useState } from "react";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Grid from "@mui/material/Grid2";
import ItemsList from "./ItemList";
import { CircularProgress, Divider } from "@mui/material";
import { isEmpty } from "../../Utils";
import { useDispatch } from "react-redux";
import { toggleArchive } from "../../../actions/order.action";
import axios from "axios";
import { Box } from "@mui/system";

const OrderCard = ({ order, modal, handleOnChange }) => {
  const {
    items,
    tableNumber,
    specialInstructions,
    isArchived,
    _id,
    orderType,
    orderDate,
    isSuccess,
    orderNumber,
    clientData,
  } = order;

  const dispatch = useDispatch();

  const [archived, setArchived] = useState(isArchived);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleLocalChange = async () => {
    try {
      setArchived(!archived);
      dispatch(toggleArchive({ id: _id, isArchived: !archived }));
      if (modal === true) handleOnChange();
    } catch (error) {
      console.error("Error while changing the state", error);
    }
  };

  const handlePrint = async () => {
    setIsSubmitting(true);

    const items = order.items.map((item) => {
      const meal = {
        type: item.type,
        name: item.name,
        base: item.base,
        proteins: item.proteins,
        extraProteins: item.extraProtein,
        garnishes: item.garnishes,
        toppings: item.toppings,
        sauces: item.sauces,
        quantity: item.quantity,
      };
      return meal;
    });

    const dataToPrint = {
      tableNumber,
      items: items,
    };

    try {
      const response = await axios.post(
        `${process.env.REACT_APP_API_URL}api/order/print-order`,
        { orderData: dataToPrint }
      );
      console.log("Commande envoyée avec succès:", response.data);
    } catch (error) {
      console.error(
        "Erreur lors de l'envoi des données à l'API:",
        error.response?.data || error.message
      );
    }

    setIsSubmitting(false);
  };

  if (archived === false || modal === true)
    return (
      <Card sx={{ minWidth: 275 }}>
        <CardContent>
          <Box sx={{ display: "flex", justifyContent: "space-between" }}>
            {isSuccess ? (
              <Typography variant="body2" color="success" fontWeight={700}>
                Payé
              </Typography>
            ) : (
              <Typography variant="body2" color="error" fontWeight={700}>
                À payer
              </Typography>
            )}
            {orderType === "clickandcollect" && (
              <Typography variant="body2" fontWeight={700}>
                {orderNumber}
              </Typography>
            )}
          </Box>
          {orderType === "dine-in" ? (
            <Typography variant="h5">Table: {tableNumber}</Typography>
          ) : (
            <Box>
              <Typography variant="h5">Click and Collect</Typography>
            </Box>
          )}
          {orderDate?.date && (
            <Typography variant="body2">
              {orderDate.date} - {orderDate.time}
            </Typography>
          )}
          <Divider sx={{ my: 1 }} />
          {items.map((item, index) => (
            <ItemsList key={index} item={item} />
          ))}
          {!isEmpty(specialInstructions) && (
            <Box>
              <Divider sx={{ my: 1 }} />
              <Typography sx={{ color: "text.secondary" }}>Comments</Typography>
              <Typography variant="body2">{specialInstructions}</Typography>
            </Box>
          )}
          {clientData && (
            <Box>
              <Divider sx={{ my: 1 }} />
              <Typography sx={{ color: "text.secondary" }}>Infos</Typography>
              <Typography variant="body2">{clientData.name}</Typography>
              <Typography variant="body2">{clientData.phone}</Typography>
              <Typography variant="body2">{clientData.email}</Typography>
            </Box>
          )}
        </CardContent>
        <Grid container spacing={0}>
          <Grid size={6}>
            {isSubmitting ? (
              <CircularProgress />
            ) : (
              <Button fullWidth variant="text" onClick={handlePrint}>
                Print
              </Button>
            )}
          </Grid>
          <Grid size={6}>
            <Button fullWidth variant="text" onClick={handleLocalChange}>
              {archived ? "Unarchive" : "Archive"}
            </Button>
          </Grid>
        </Grid>
      </Card>
    );
};

export default OrderCard;
