import React, { useState } from "react";
import { Switch, Typography, TableRow, TableCell } from "@mui/material";
import { useDispatch } from "react-redux";
import { toggleTables } from "../../../actions/table.action";

const TableItem = ({ table }) => {
  const dispatch = useDispatch();
  const { tableNumber, isOpen, _id } = table;

  const [open, setOpen] = useState(isOpen);

  const handleOnChange = async () => {
    try {
      setOpen(!open);
      dispatch(toggleTables({ _id: _id, isOpen: !isOpen }));
    } catch (error) {
      console.error("Error while changing the state", error);
    }
  };

  return (
    <TableRow>
      <TableCell>
        <Typography>Table {tableNumber}</Typography>
      </TableCell>
      <TableCell width={1}>
        <Switch
          checked={open}
          onChange={handleOnChange}
          inputProps={{ "aria-label": `Table ${tableNumber}` }}
        />
      </TableCell>
    </TableRow>
  );
};

export default TableItem;
