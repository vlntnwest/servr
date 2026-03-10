import React from "react";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import Admin from "../../pages/Admin";
import Table from "../../pages/Table";
import ClickAndCollect from "../../pages/ClickAndCollect";
import OrderConfirmed from "../../pages/OrderConfirmed";

const Index = () => {
  return (
    <BrowserRouter
      future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
    >
      <Routes>
        <Route path="/" element={<ClickAndCollect />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/table/:tableNumber" element={<Table />} />
        <Route path="/table/*" element={<Navigate to="/" />} />
        <Route path="/clickandcollect" element={<ClickAndCollect />} />
        <Route path="/confirmation/:orderId" element={<OrderConfirmed />} />
        <Route path="/*" element={<Navigate to="/" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default Index;
