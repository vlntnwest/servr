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

const ProtForm = ({ selectedProt, handleProtChange }) => {
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
    <RadioGroup value={selectedProt} sx={{ pt: 3 }}>
      <Typography variant="h4" sx={{ fontSize: 20 }}>
        Choisis ta protéines
      </Typography>
      <List sx={{ p: 0, pt: 1 }}>
        {proteins.map((prot) => (
          <ListItemButton
            key={prot.name}
            sx={{ p: 0 }}
            onClick={() => handleProtChange(prot.name)}
          >
            <ListItemText
              primary={prot.name}
              disableTypography
              sx={{ fontSize: 16 }}
            />
            <Radio
              checked={selectedProt === prot.name}
              value={prot.name}
              name="radio-buttons"
              sx={{ ml: 2 }}
            />
          </ListItemButton>
        ))}
      </List>
    </RadioGroup>
  );
};

export default ProtForm;
