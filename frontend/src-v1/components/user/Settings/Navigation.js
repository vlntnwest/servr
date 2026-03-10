import React from "react";
import NavigationMenu from "./NavigationMenu";
import InsideDrawer from "../InsideDrawer";

const Navigation = ({ toggleDrawer }) => {
  return (
    <InsideDrawer toggleDrawer={toggleDrawer}>
      <NavigationMenu />
    </InsideDrawer>
  );
};

export default Navigation;
