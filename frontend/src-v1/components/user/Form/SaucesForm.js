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

const SaucesForm = ({ selectedSauces, handleSauceChange, isSauceDisabled }) => {
  const [sauces, setSauces] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomItems = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}api/item/custom/sauces`
        );
        setSauces(response.data);
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
        Choisissez vos sauces
      </Typography>
      <Typography variant="body2">Obligatoire</Typography>
      <List sx={{ p: 0, pt: 1 }}>
        {sauces.map((sauce) => (
          <ListItemButton
            key={sauce.name}
            onClick={() => handleSauceChange(sauce.name)}
            sx={{ p: 0 }}
            disabled={isSauceDisabled && !selectedSauces.includes(sauce.name)}
          >
            <ListItemText
              primary={sauce.name}
              disableTypography
              sx={{ fontSize: 16 }}
            />
            <Checkbox
              checked={selectedSauces.includes(sauce.name)}
              onChange={() => handleSauceChange(sauce.name)}
              value={sauce.name}
            />
          </ListItemButton>
        ))}
      </List>
    </FormGroup>
  );
};

export default SaucesForm;
