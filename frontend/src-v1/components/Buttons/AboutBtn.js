import React from "react";
import { Button, Divider, Typography } from "@mui/material";
import { Box } from "@mui/system";
import ArrowForwardIosRoundedIcon from "@mui/icons-material/ArrowForwardIosRounded";

const AboutBtn = ({ label, link, isLast }) => {
  const handleClick = (e) => {
    e.preventDefault();
    if (link.startsWith("mailto:")) {
      window.location.href = link;
    } else {
      window.open(link, "_blank");
    }
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
        onClick={(e) => handleClick(e)}
      >
        {" "}
        <Box
          sx={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
          }}
        >
          <Box
            sx={{
              flex: 1,
              py: 1.5,
              pl: 2,
              pr: 2,
              mr: "auto",
              alignItems: "flex-start",
            }}
          >
            <Typography
              sx={{
                textAlign: "left",
                fontWeight: "400",
                textTransform: "none",
              }}
            >
              {label}
            </Typography>
          </Box>
          <Box sx={{ ml: 2 }}>
            <Box sx={{ display: "flex", px: 2, py: 1.5, alignItems: "center" }}>
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
    </>
  );
};

export default AboutBtn;
