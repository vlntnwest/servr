import React, { useState } from "react";
import { useCheckout } from "@stripe/react-stripe-js";
import FullWidthBtn from "../../Buttons/FullWidthBtn";
import { Typography } from "@mui/material";

const PayButton = ({ handleSubmit }) => {
  const { confirm } = useCheckout();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleClick = async () => {
    setLoading(true);

    try {
      const result = await confirm({
        redirect: "if_required",
      });

      if (result.type === "success") {
        handleSubmit(result.success.id);
      }
      if (result.type !== "success") {
        setError(result.error.message);
      }
    } catch (error) {
      console.error("Une erreur s'est produite :", error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <Typography variant="body2" color="error">
        {error}
      </Typography>
      <FullWidthBtn
        handleAction={handleClick}
        name={"Payer"}
        isSubmitting={loading}
      />
    </div>
  );
};

export default PayButton;
