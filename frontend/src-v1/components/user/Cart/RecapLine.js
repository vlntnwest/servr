import {
  Box,
  Button,
  Dialog,
  Divider,
  Drawer,
  Typography,
} from "@mui/material";
import React, { useState } from "react";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import EditCartItems from "./EditCartItems";
import { formatPrice } from "../../Utils";
import { useShop } from "../../Context/ShopContext";

const RecapLine = ({ item, updateItemCount, isLast }) => {
  const { isMobile } = useShop();
  const [open, setOpen] = useState(false);
  const orderDetails = [
    ...[item.base],
    ...(item.garnishes ? item.garnishes : []),
    ...(item.sauces ? item.sauces : []),
    ...(item.toppings ? item.toppings : []),
  ];

  const toggleDrawer = (newOpen) => () => {
    setOpen(newOpen);
  };

  const calculateTotalPrice = () => {
    let price = formatPrice(item.price);

    let totalPrice = item.quantity * price;

    if (item?.extraProtein?.length > 0 && item.extraProteinPrice) {
      totalPrice += item.quantity * item.extraProteinPrice;
    }
    return totalPrice.toFixed(2);
  };

  return (
    <>
      <Button
        color="secondary"
        disableElevation
        fullWidth
        sx={{
          p: 0,
          display: "block",
        }}
        onClick={toggleDrawer(true)}
      >
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box sx={{ mr: 1.5, pl: 2, py: 1.5 }}>
            <Typography variant="body1" sx={{ textTransform: "lowercase" }}>
              {item.quantity}x
            </Typography>
          </Box>
          <Box
            sx={{
              flex: 1,
              py: 1.5,
              pl: 1.5,
              pr: 2,
              mr: "auto",
              alignItems: "flex-start",
            }}
          >
            <Typography variant="body1" sx={{ textAlign: "left" }}>
              {item.name}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                textAlign: "left",
                textTransform: "none",
                pt: 0.5,
              }}
            >
              {item.proteins && item.proteins.trim !== "" && item.proteins}
            </Typography>
            <Typography
              variant="body2"
              sx={{
                textAlign: "left",
                textTransform: "none",
                pt: 0.5,
              }}
            >
              {orderDetails.filter(Boolean).join(", ")}
            </Typography>
            {item.extraProtein && item.extraProtein.length > 0 && (
              <Box>
                <Typography
                  variant="body2"
                  sx={{
                    textAlign: "left",
                    textTransform: "none",
                    pt: 0.5,
                  }}
                >
                  Extra protéine: {item.extraProtein.map((protein) => protein)}
                </Typography>
              </Box>
            )}
          </Box>
          <Box sx={{ ml: 1.5 }}>
            <Box sx={{ display: "flex", px: 2, py: 1.5, alignItems: "center" }}>
              <Typography variant="body1" sx={{ fontWeight: "400" }}>
                {calculateTotalPrice().replace(".", ",")}€
              </Typography>
              <ArrowForwardIosRoundedIcon
                sx={{ ml: 1, maxHeight: "21px" }}
                color="primary"
              />
            </Box>
          </Box>
        </Box>
      </Button>
      {!isLast && (
        <Divider variant="middle" sx={{ borderColor: "#0000000a" }} />
      )}
      {isMobile ? (
        <Drawer open={open} onClose={toggleDrawer(false)} anchor="bottom">
          <EditCartItems
            toggleDrawer={toggleDrawer}
            item={item}
            updateItemCount={updateItemCount}
          />
        </Drawer>
      ) : (
        <Dialog open={open} onClose={toggleDrawer(false)} anchor="bottom">
          <EditCartItems
            toggleDrawer={toggleDrawer}
            item={item}
            updateItemCount={updateItemCount}
          />
        </Dialog>
      )}
    </>
  );
};

export default RecapLine;
