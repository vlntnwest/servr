import React, { useEffect, useState } from "react";
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

const SupProtForm = ({
  handleProtSupChange,
  isSupProtDisabled,
  selectedProtSup,
}) => {
  const [proteins, setProteins] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchCustomItems = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}api/item/custom/proteins`
        );
        setProteins(response.data);
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
        Protéines supplémentaires
      </Typography>
      <Typography variant="body2">
        Voulez-vous des protéines en supplément?
      </Typography>
      <List sx={{ p: 0, pt: 1 }}>
        {proteins.map((supProt) => (
          <ListItemButton
            key={supProt.name}
            onClick={() => handleProtSupChange(supProt.name)}
            sx={{ p: 0 }}
            disabled={
              isSupProtDisabled && !selectedProtSup.includes(supProt.name)
            }
          >
            <ListItemText
              primary={supProt.name}
              disableTypography
              sx={{ fontSize: 16 }}
            />
            <span style={{ fontSize: 16 }}>+{supProt.price}€</span>
            <Checkbox
              checked={selectedProtSup.includes(supProt.name)}
              onChange={() => handleProtSupChange(supProt.name)}
              value={supProt.name}
            />
          </ListItemButton>
        ))}
      </List>
    </FormGroup>
  );
};

export default SupProtForm;
