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
import React, { useEffect, useState } from "react";
import axios from "axios";

const GarnishesForm = ({
  selectedGarnishes,
  handleGarnishesChange,
  isGarnisheDisabled,
}) => {
  const [garnishes, setGarnishes] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomItems = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}api/item/custom/garnishes`
        );
        setGarnishes(response.data);
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
        Choisis 4 accompagnements !
      </Typography>
      <Typography variant="body2">Obligatoire</Typography>
      <List sx={{ p: 0, pt: 1 }}>
        {garnishes.map((garnishe) => (
          <ListItemButton
            key={garnishe.name}
            onClick={() => handleGarnishesChange(garnishe.name)}
            sx={{ p: 0 }}
            disabled={
              isGarnisheDisabled && !selectedGarnishes.includes(garnishe.name)
            }
          >
            <ListItemText
              primary={garnishe.name}
              disableTypography
              sx={{ fontSize: 16 }}
            />
            <Checkbox
              checked={selectedGarnishes.includes(garnishe.name)}
              onChange={() => handleGarnishesChange(garnishe.name)}
              value={garnishe.name}
            />
          </ListItemButton>
        ))}
      </List>
    </FormGroup>
  );
};

export default GarnishesForm;
