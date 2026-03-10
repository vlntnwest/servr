import React, { useState } from "react";
import { Box } from "@mui/system";
import AboutBtn from "../../Buttons/AboutBtn";
import { Drawer, Link } from "@mui/material";
import InsideDrawer from "../InsideDrawer";
import ConfidentialityPolicy from "../Legal/ConfidentialityPolicy";
import GeneralConditions from "../Legal/GeneralConditions";

const aboutList = [
  {
    label: "Nous contacter",
    link: "mailto:pokey.bar@gmail.com?subject=Demande de renseignements",
  },
];
const linkList = [
  {
    label: "Politique de confidentialité",
    component: `ConfidentialityPolicy`,
  },
  {
    label: "Conditions générales",
    component: "GeneralConditions",
  },
];

const componentMap = {
  ConfidentialityPolicy,
  GeneralConditions,
};

const About = () => {
  const [open, setOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState(null);

  const ComponentToRender = componentMap[selectedItem?.component];

  const toggleDrawer = (newOpen, item = null) => {
    return () => {
      setOpen(newOpen);
      setSelectedItem(item);
    };
  };

  return (
    <>
      <Box
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Box
          sx={{
            backgroundColor: "white",
            borderTop: "1px solid rgba(0, 0, 0, 0.05)",
            borderBottom: "1px solid rgba(0, 0, 0, 0.05)",
          }}
        >
          {aboutList.map((item, index) => (
            <AboutBtn
              label={item.label}
              key={index}
              link={item.link}
              isLast={index === aboutList.length - 1}
            />
          ))}
        </Box>
        <Box
          sx={{
            display: "flex",
            justifyContent: "center",
            gap: 2,
            pt: 2,
          }}
        >
          {linkList.map((item, index) => (
            <Link
              key={index}
              sx={{
                textTransform: "none",
                color: "rgba(0, 0, 0, 0.6);",
                fontSize: "0.75rem",
                fontWeight: "400",
                textDecoration: "underline",
              }}
              onClick={toggleDrawer(true, item)}
            >
              {item.label}
            </Link>
          ))}
        </Box>
        <Drawer
          open={open}
          onClose={toggleDrawer(false)}
          anchor="right"
          hideBackdrop
        >
          <InsideDrawer
            toggleDrawer={toggleDrawer}
            name={selectedItem?.label}
            back
          >
            {ComponentToRender ? (
              <ComponentToRender />
            ) : (
              <p>Contenu introuvable</p>
            )}
          </InsideDrawer>
        </Drawer>
      </Box>
    </>
  );
};

export default About;
