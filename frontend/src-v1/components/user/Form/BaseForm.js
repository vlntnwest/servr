import {
  Alert,
  CircularProgress,
  List,
  ListItemButton,
  ListItemText,
  Radio,
  RadioGroup,
  Typography,
} from "@mui/material";
import axios from "axios";
import React, { useEffect, useState } from "react";

const BaseForm = ({ selectedBase, handleBaseChange }) => {
  const [bases, setBases] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomItems = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}api/item/custom/bases`
        );
        setBases(response.data);
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
    <RadioGroup value={selectedBase} sx={{ pt: 3 }}>
      <Typography variant="h4" sx={{ fontSize: 20 }}>
        Choisissez votre base
      </Typography>
      <Typography variant="body2">Obligatoire</Typography>
      <List sx={{ p: 0, pt: 1 }}>
        {bases.map((base) => (
          <ListItemButton
            key={base.name}
            sx={{ p: 0 }}
            onClick={() => handleBaseChange(base.name)}
          >
            <ListItemText
              primary={base.name}
              disableTypography
              sx={{ fontSize: 16 }}
            />
            <Radio
              checked={selectedBase === base.name}
              value={base.name}
              name="radio-buttons"
              sx={{ ml: 2 }}
            />
          </ListItemButton>
        ))}
      </List>
    </RadioGroup>
  );
};

export default BaseForm;
