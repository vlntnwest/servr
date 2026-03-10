import React, { useState } from "react";
import { Button, Divider, Drawer, Typography, Card } from "@mui/material";
import { Box } from "@mui/system";
import { formatEuros, isEmpty } from "../../Utils";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";
import InsideDrawer from "../InsideDrawer";
import CalendarMonthRoundedIcon from "@mui/icons-material/CalendarMonthRounded";

const OrderCardHistory = ({ order, isLast }) => {
  const [open, setOpen] = useState(false);
  const toggleDrawer = (newOpen) => () => setOpen(newOpen);
  const { orderNumber, createdAt, totalPrice, items } = order;

  const isoDate = new Date(createdAt);
  const localedateformat = isoDate.toLocaleDateString("fr-FR", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
  });

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
            alignItems: "center",
          }}
        >
          <Box sx={{ mr: 1.5, pl: 2, py: 1.5, textAlign: "left" }}>
            <Typography variant="h3" sx={{ textTransform: "none" }}>
              Commande #{orderNumber}
            </Typography>
            <Typography variant="body2" sx={{ textTransform: "none" }}>
              {formatEuros(totalPrice / 100)} • {localedateformat}
            </Typography>
          </Box>
          <Box sx={{ display: "flex" }} p={2} ml={1}>
            <ArrowForwardIosRoundedIcon
              sx={{ ml: 1, maxHeight: "21px" }}
              color="primary"
            />
          </Box>
        </Box>
      </Button>
      {isLast && <Divider variant="middle" sx={{ borderColor: "#0000000a" }} />}
      <Drawer
        open={open}
        onClose={toggleDrawer(false)}
        anchor="right"
        hideBackdrop
      >
        <InsideDrawer
          toggleDrawer={toggleDrawer}
          name={`Commande #${orderNumber}`}
          back
        >
          <Box sx={{ width: "100%", textAlign: "left" }} px={2}>
            <Typography variant="h3" mb={1}>
              Informations
            </Typography>
            <Card
              sx={{
                backgroundColor: "white",
                display: "flex",
                alignItems: "center",
                p: 2,
                mb: 3,
                gap: 1.5,
              }}
            >
              <CalendarMonthRoundedIcon />
              <Typography>Le {localedateformat}</Typography>
            </Card>
            <Typography variant="h3" mb={1}>
              Votre commande ({items.length} produits)
            </Typography>
            <Card sx={{ border: "1px solid rgba(0, 0, 0, 0.05)" }}>
              {items.map((item) => (
                <Box
                  sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-start",
                  }}
                  key={item._id}
                >
                  <Box sx={{ mr: 1.5, pl: 2, py: 1.5 }}>
                    <Typography
                      sx={{ fontWeight: "400", textTransform: "lowercase" }}
                    >
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
                    {!isEmpty(item.base) && <DetailsList name={item.base} />}
                    {!isEmpty(item.garnishes) && (
                      <DetailsList name={item.garnishes} />
                    )}
                    {!isEmpty(item.proteins) && (
                      <DetailsList name={item.proteins} />
                    )}
                    {!isEmpty(item.sauces) && (
                      <DetailsList name={item.sauces} />
                    )}
                    {!isEmpty(item.extraProtein) && (
                      <DetailsList name={item.extraProtein} />
                    )}
                  </Box>
                  <Box sx={{ ml: 1.5 }}>
                    <Box
                      sx={{
                        display: "flex",
                        px: 2,
                        py: 1.5,
                        alignItems: "center",
                      }}
                    >
                      <Typography sx={{ fontWeight: "400" }}>
                        {formatEuros(item.price / 100)}
                      </Typography>
                    </Box>
                  </Box>
                </Box>
              ))}
              <Divider />
              <Box
                sx={{
                  width: "100%",
                  display: "flex",
                }}
                p={2}
              >
                <Box sx={{ flex: 1 }}>
                  <Typography
                    variant="body1"
                    color="textPrimary"
                    sx={{ fontWeight: 700 }}
                  >
                    Total de la commande
                  </Typography>
                </Box>
                <Box>
                  <Typography color="textPrimary" sx={{ fontWeight: 700 }}>
                    {formatEuros(totalPrice)}
                  </Typography>
                </Box>
              </Box>
            </Card>
          </Box>
        </InsideDrawer>
      </Drawer>
    </>
  );
};

export default OrderCardHistory;

const DetailsList = ({ name }) => {
  const displayName =
    Array.isArray(name) && name.length > 1 ? name.join(", ") : name;

  return (
    <Typography
      variant="body2"
      sx={{
        textAlign: "left",
        color: "text.secondary",
        textTransform: "none",
        pt: 0.5,
      }}
    >
      {displayName}
    </Typography>
  );
};
