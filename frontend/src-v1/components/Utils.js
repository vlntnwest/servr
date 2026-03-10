export const isEmpty = (value) => {
  return (
    value === undefined ||
    value === null ||
    (typeof value === "object" && Object.keys(value).length === 0) ||
    (typeof value === "string" && value.trim().length === 0)
  );
};

export const formatPrice = (price) => {
  return parseFloat(price.replace(",", "."));
};

export const formatPriceBack = (price) => {
  return parseFloat(price.replace(".", ","));
};

export const formatEuros = (number) => {
  return number.toLocaleString("fr-FR", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2,
  });
};
