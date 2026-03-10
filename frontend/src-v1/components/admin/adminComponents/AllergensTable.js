import React, { useEffect, useState } from "react";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import { useDispatch, useSelector } from "react-redux";
import {
  Box,
  Checkbox,
  Divider,
  TextField,
  Toolbar,
  Tooltip,
  Typography,
} from "@mui/material";
import { addFood, deleteFood, editFood } from "../../../actions/food.action";
import IconButton from "@mui/material/IconButton";
import DeleteIcon from "@mui/icons-material/Delete";
import api from "../../../api";

const COLOR_MAP = {
  non: "",
  trace: "#cbdaf1",
  oui: "#1f4493",
};

const NEXT_STATE = {
  non: "trace",
  trace: "oui",
  oui: "non",
};

const cellStyle = {
  borderLeft: "1px solid rgb(224, 224, 224)",
};

const AllergensTable = () => {
  const [allergenData, setAllergenData] = useState([]);
  const [newFood, setNewFood] = useState("");
  const foodReducer = useSelector((state) => state.foodReducer);
  const [foodsData, setFoodsData] = useState([]);
  const [isChecked, setIsChecked] = useState([]);
  const rowCount = foodReducer.length;
  const numSelected = isChecked.length;
  const dispatch = useDispatch();

  useEffect(() => {
    const fetchData = async () => {
      await api.get(`api/allergen`).then((res) => setAllergenData(res.data));

      setFoodsData(foodReducer);
    };
    fetchData();
  }, [foodReducer]);

  const handleCellClick = async (foodIndex, allergen, food) => {
    if (!isChecked.includes(food._id)) {
      return;
    }

    const updatedFoods = [...foodsData];

    const updatedAllergens = updatedFoods[foodIndex].allergens.map(
      (currentAllergen) => {
        if (currentAllergen.allergen_id === allergen.allergen_id) {
          return {
            ...currentAllergen,
            level: NEXT_STATE[currentAllergen.level],
          };
        }
        return currentAllergen;
      }
    );

    updatedFoods[foodIndex] = {
      ...updatedFoods[foodIndex],
      allergens: updatedAllergens,
    };

    const data = {
      allergen_id: allergen._id,
      level: NEXT_STATE[allergen.level],
    };

    await dispatch(editFood(food._id, data));
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    try {
      dispatch(addFood(newFood));
    } catch (error) {
      console.error("Erreur lors de la suppression des aliments :", error);
    }

    setNewFood("");
  };

  const handleCheckbox = (e, food) => {
    setIsChecked((prevTrash) =>
      e.target.checked
        ? [...prevTrash, food._id]
        : prevTrash.filter((id) => id !== food._id)
    );
  };

  const selectAll = (e) => {
    if (e.target.checked) {
      setIsChecked(foodsData.map((food) => food._id));
    } else {
      setIsChecked([]);
    }
  };

  const emptyTrash = async (e) => {
    try {
      await dispatch(deleteFood(isChecked));
      setIsChecked([]);
    } catch (error) {
      console.error("Erreur lors de la suppression des aliments :", error);
    }
  };

  return (
    <Paper sx={{ width: "100%", overflow: "hidden" }}>
      {" "}
      <Toolbar>
        {numSelected > 0 ? (
          <Typography
            sx={{ flex: "1 1 100%" }}
            color="inherit"
            variant="subtitle1"
            component="div"
          >
            {numSelected > 1
              ? `${numSelected} sélectionnés`
              : `${numSelected} sélectionné`}
          </Typography>
        ) : (
          <Typography
            sx={{ flex: "1 1 100%" }}
            variant="h6"
            id="tableTitle"
            component="div"
          >
            Allergènes
          </Typography>
        )}
        {numSelected > 0 ? (
          <Tooltip title="Delete">
            <IconButton onClick={emptyTrash}>
              <DeleteIcon />
            </IconButton>
          </Tooltip>
        ) : null}
      </Toolbar>
      <TableContainer component={Paper} sx={{ maxHeight: "80vh" }}>
        <Table stickyHeader aria-label="simple table">
          <TableHead>
            <TableRow>
              <TableCell
                sx={{
                  backgroundColor: "white",
                  position: "sticky",
                  left: 0,
                  zIndex: 20,
                  width: 74,
                }}
              >
                <Checkbox
                  color="primary"
                  indeterminate={numSelected > 0 && numSelected < rowCount}
                  checked={rowCount > 0 && numSelected === rowCount}
                  onChange={selectAll}
                  inputProps={{
                    "aria-label": "select all foods",
                  }}
                />
              </TableCell>
              <TableCell
                sx={{
                  backgroundColor: "white",
                  position: "sticky",
                  left: 74,
                  zIndex: 20,
                  minWidth: 150,
                }}
              >
                <Typography variant="body1" component="p">
                  Aliments
                </Typography>
              </TableCell>
              {allergenData.map((allergen, index) => (
                <TableCell
                  key={index}
                  align="center"
                  sx={{ backgroundColor: "white", minWidth: 150 }}
                >
                  <Typography
                    variant="body1"
                    component="p"
                    sx={{ fontWeight: 400 }}
                  >
                    {allergen.name}
                  </Typography>
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {foodsData.map((food, foodIndex) => (
              <TableRow key={food.name}>
                <TableCell
                  sx={{
                    backgroundColor: "white",
                    position: "sticky",
                    left: 0,
                    zIndex: 1,
                    width: 74,
                  }}
                >
                  <Checkbox
                    color="primary"
                    onChange={(e) => handleCheckbox(e, food)}
                    checked={isChecked.includes(food._id)}
                  />
                </TableCell>
                <TableCell
                  scope="row"
                  sx={{
                    backgroundColor: "white",
                    position: "sticky",
                    left: 74,
                    zIndex: 1,
                    minWidth: 150,
                  }}
                  style={cellStyle}
                >
                  <Typography
                    variant="body1"
                    component="p"
                    sx={{ fontWeight: 400 }}
                  >
                    {food.name}
                  </Typography>
                </TableCell>
                {food.allergens.map((allergen, index) => {
                  const allergenLevel = allergen.level || "oui";
                  return (
                    <TableCell
                      key={index}
                      align="center"
                      onClick={() => handleCellClick(foodIndex, allergen, food)}
                      sx={{
                        backgroundColor: COLOR_MAP[allergenLevel],
                        cursor: "pointer",
                        transition: "background 0.3s",
                      }}
                      style={cellStyle}
                    ></TableCell>
                  );
                })}
              </TableRow>
            ))}
          </TableBody>
        </Table>
        <Toolbar>
          <Box component="form" onSubmit={(e) => handleSubmit(e)}>
            <TextField
              sx={{ minWidth: 150 }}
              variant="outlined"
              size="small"
              placeholder="Nom"
              value={newFood}
              onChange={(e) => setNewFood(e.target.value)}
            />
          </Box>
        </Toolbar>
        <Divider variant="middle" />
        <Box
          sx={{
            my: 2,
            ml: 2,
            display: "flex",
            justifyContent: "flex-start",
            alignItems: "center",
          }}
        >
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: "#cbdaf1",
              marginRight: 1,
            }}
          ></Box>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ marginRight: 3 }}
          >
            Trace
          </Typography>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: "#1f4493",
              marginRight: 1,
            }}
          ></Box>
          <Typography
            variant="body2"
            color="textSecondary"
            sx={{ marginRight: 3 }}
          >
            Présent
          </Typography>
          <Box
            sx={{
              width: 20,
              height: 20,
              backgroundColor: "transparent",
              border: "1px solid #000",
              marginRight: 1,
            }}
          ></Box>
          <Typography variant="body2" color="textSecondary">
            Aucun
          </Typography>
        </Box>
      </TableContainer>
    </Paper>
  );
};

export default AllergensTable;
