import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Alert,
  Box,
  CircularProgress,
  FormControl,
  FormGroup,
  InputLabel,
  List,
  ListItemButton,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Typography,
} from "@mui/material";
import AddCircleOutlineIcon from "@mui/icons-material/AddCircleOutline";
import RemoveCircleOutlineIcon from "@mui/icons-material/RemoveCircleOutline";

const SideForm = ({ handleSideChange }) => {
  const [sides, setSides] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sauceSelections, setSauceSelections] = useState({});
  const [sideCounts, setSideCounts] = useState({});

  useEffect(() => {
    const fetchCustomItems = async () => {
      setIsLoading(true);
      try {
        const response = await axios.get(
          `${process.env.REACT_APP_API_URL}api/item/custom/sides`
        );
        setSides(response.data);
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

  const handleSideAdd = (side) => {
    // Get the current count for the selected side (default is 0 if not found)
    const currentCount = sideCounts[side.name] || 0;

    // Determine the new count (toggle between 1 and 0)
    const newCount = currentCount === 1 ? 0 : 1;

    // Update the sideCounts state with the new count for the selected side
    setSideCounts((prevCounts) => {
      const updatedCounts = {
        ...prevCounts,
        [side.name]: newCount, // Update the count for the selected side
      };

      // If the side count becomes 0, remove the entry from the sauceSelections as well
      if (newCount === 0) {
        const updatedSelections = { ...sauceSelections };
        delete updatedSelections[side.name]; // Remove the sauce selection for the side
        setSauceSelections(updatedSelections);
        handleSideChange(side.name, newCount, updatedSelections);
      }

      return updatedCounts;
    });

    // Determine the selected sauce based on the new count (null if count is 0)
    const selectedSauce =
      newCount === 0
        ? null
        : side.hasSauce
        ? sauceSelections[side.name] || "Sans sauce"
        : null;

    // If the side does not have sauce, notify the parent with the side name, new count, and selected sauce
    handleSideChange(side.name, newCount, selectedSauce);
  };

  const handleSauceChange = (e, sideName) => {
    const selectedSauce = e.target.value || "Sans sauce";
    setSauceSelections((prevSelections) => ({
      ...prevSelections,
      [sideName]: selectedSauce,
    }));

    const count = sideCounts[sideName] || 0;
    handleSideChange(sideName, count, selectedSauce);
  };

  return (
    <FormGroup sx={{ pt: 3 }}>
      <Typography variant="h4" sx={{ fontSize: 20 }}>
        Envie d'accompagnements pour compléter ton pokey ?
      </Typography>
      <List sx={{ p: 0, pt: 1 }}>
        {sides.map((side) => (
          <div key={side.name}>
            <ListItemButton onClick={(e) => handleSideAdd(side)} sx={{ p: 0 }}>
              <ListItemText
                primary={side.name}
                disableTypography
                sx={{ fontSize: 16, fontWeight: "400" }}
              />
              <span style={{ fontSize: 16, fontWeight: "400" }}>
                +{side.price}€
              </span>
              {sideCounts[side.name] > 0 ? (
                <>
                  <RemoveCircleOutlineIcon
                    color="primary"
                    sx={{ margin: "11px" }}
                  />
                  <span>{sideCounts[side.name]}</span>
                  <AddCircleOutlineIcon
                    color="disabled"
                    sx={{ margin: "11px" }}
                  />
                </>
              ) : (
                <AddCircleOutlineIcon sx={{ margin: "11px" }} />
              )}
            </ListItemButton>

            {side.hasSauce && sideCounts[side.name] > 0 && (
              <Box>
                <FormControl fullWidth>
                  <InputLabel id="sideSauceSelectLabel">
                    Choisis ta sauce
                  </InputLabel>
                  <Select
                    labelId={`sideSauceSelectLabel-${side.name}`}
                    id={`sideSauceSelect-${side.name}`}
                    value={sauceSelections[side.name] || ""}
                    label="Sauce"
                    onChange={(e) => handleSauceChange(e, side.name)}
                    input={<OutlinedInput label="Choisis ta sauce" />}
                  >
                    <MenuItem value="Soja salé">Soja salé</MenuItem>
                    <MenuItem value="Soja sucré">Soja sucré</MenuItem>
                    <MenuItem value="Spicy mayo">Spicy mayo</MenuItem>
                    <MenuItem value="Sans sauce">Sans sauce</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            )}
          </div>
        ))}
      </List>
    </FormGroup>
  );
};

export default SideForm;
