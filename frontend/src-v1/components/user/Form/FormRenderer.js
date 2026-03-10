// FormRenderer.js
import React from "react";
import BaseForm from "./BaseForm";
import SaucesForm from "./SaucesForm";
import SideForm from "./SideForm";
import SupProtForm from "./SupProtForm";
import ProtForm from "./ProtForm";
import GarnishesForm from "./GarnishesForm";
import ToppingsForm from "./ToppingsForm";

const FormRenderer = ({ meal, options, handlers }) => {
  const { type, hasSauce } = meal;
  const {
    selectedBase,
    selectedProt,
    selectedGarnishes,
    selectedToppings,
    selectedSauces,
    selectedProtSup,
    addSideCounts,
    isGarnisheDisabled,
    isSauceDisabled,
    isSupProtDisabled,
    isToppingsDisabled,
  } = options;
  const {
    handleBaseChange,
    handleProtChange,
    handleGarnishesChange,
    handleToppingsChange,
    handleSauceChange,
    handleSideChange,
    handleProtSupChange,
  } = handlers;
  return (
    <>
      {(type === "bowl" || type === "custom") && (
        <BaseForm
          selectedBase={selectedBase}
          handleBaseChange={handleBaseChange}
        />
      )}
      {type === "custom" && (
        <>
          <ProtForm
            selectedProt={selectedProt}
            handleProtChange={handleProtChange}
          />
          <GarnishesForm
            selectedGarnishes={selectedGarnishes}
            handleGarnishesChange={handleGarnishesChange}
            isGarnisheDisabled={isGarnisheDisabled}
          />
          <ToppingsForm
            selectedToppings={selectedToppings}
            handleToppingsChange={handleToppingsChange}
            isToppingsDisabled={isToppingsDisabled}
          />
        </>
      )}
      {(type === "bowl" ||
        type === "custom" ||
        (type === "side" && hasSauce === true)) && (
        <SaucesForm
          selectedSauces={selectedSauces}
          handleSauceChange={handleSauceChange}
          isSauceDisabled={isSauceDisabled}
        />
      )}
      {(type === "bowl" || type === "custom") && (
        <SideForm
          handleSideChange={handleSideChange}
          addSideCounts={addSideCounts}
        />
      )}
      {(type === "bowl" || type === "custom") && (
        <SupProtForm
          handleProtSupChange={handleProtSupChange}
          isSupProtDisabled={isSupProtDisabled}
          selectedProtSup={selectedProtSup}
        />
      )}
    </>
  );
};

export default FormRenderer;
