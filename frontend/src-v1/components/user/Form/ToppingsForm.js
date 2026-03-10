import {
  Alert,
  Checkbox,
  CircularProgress,
  FormGroup,
  List,
  ListItemButton,
  ListItemText,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const ToppingsForm = ({
  selectedToppings,
  handleToppingsChange,
  isToppingsDisabled,
}) => {
  const [toppings, setToppings] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomItems = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}api/item/custom/toppings`
        );
        setToppings(response.data);
      } catch (err) {
        console.error("Error fetching custom items:", err);
        setError(
          "Une erreur s'est produite lors de la récupération des éléments."
        );
      } finally {
        setIsLoading(false);
      }
    };

    fetchCustomItems();
  }, []);

  if (isLoading) {
    return <CircularProgress />;
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ width: "100%" }}>
        Error: {error}
      </Alert>
    );
  }
  return (
    <FormGroup sx={{ pt: 3 }}>
      <Typography variant="h4" sx={{ fontSize: 20 }}>
        Choisis 2 toppings !
      </Typography>
      <Typography variant="body2">Obligatoire</Typography>
      <List sx={{ p: 0, pt: 1 }}>
        {toppings.map((topping) => (
          <ListItemButton
            key={topping.name}
            onClick={() => handleToppingsChange(topping.name)}
            sx={{ p: 0 }}
            disabled={
              isToppingsDisabled && !selectedToppings.includes(topping.name)
            }
          >
            <ListItemText
              primary={topping.name}
              disableTypography
              sx={{ fontSize: 16 }}
            />
            <Checkbox
              checked={selectedToppings.includes(topping.name)}
              onChange={() => handleToppingsChange(topping.name)}
              value={topping.name}
            />
          </ListItemButton>
        ))}
      </List>
    </FormGroup>
  );
};

export default ToppingsForm;
