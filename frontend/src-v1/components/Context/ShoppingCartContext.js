import { createContext, useContext, useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { formatPrice } from "../Utils";

const ShoppingCartContext = createContext({});

export function useShoppingCart() {
  return useContext(ShoppingCartContext);
}

export default function ShoppingCartProvider({ children }) {
  const location = useLocation();
  const [orderType, setOrderType] = useState("");

  const [isClickAndCollect, setIsClickAndCollect] = useState(false);

  const [cartItems, setCartItems] = useState(() => {
    const storedCart = sessionStorage.getItem("Cart");
    return storedCart ? JSON.parse(storedCart) : [];
  });

  const [message, setMessage] = useState("Aucune indication renseignée");
  const [selectedDate, setSelectedDate] = useState({
    date: "",
    time: "",
  });
  const [selectedDay, setSelectedDay] = useState("now");

  const addToCart = (item) => {
    setCartItems((prevItems) => [...prevItems, item]);
  };

  const updateItemCount = (itemId, newCount) => {
    if (newCount === 0) {
      removeFromCart(itemId);
    } else {
      const updatedCart = cartItems.map((item) =>
        item.id === itemId ? { ...item, quantity: newCount } : item
      );
      setCartItems(updatedCart);
    }
  };

  const removeFromCart = (id) => {
    setCartItems((currentItems) => {
      return currentItems.filter((item) => item.id !== id);
    });
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const calculateTotalPrice = () => {
    if (cartItems.length < 1) {
      return;
    }

    const total = cartItems.map((item) => {
      const elPrice =
        (formatPrice(item.price) +
          (item.extraProteinPrice ? parseFloat(item.extraProteinPrice) : 0)) *
        item.quantity;
      return elPrice;
    });

    return parseFloat(total.reduce((acc, curr) => acc + curr).toFixed(2));
  };

  const items = cartItems.map((item) => {
    const itemPrice =
      (formatPrice(item.price) +
        (item.extraProteinPrice ? parseFloat(item.extraProteinPrice) : 0)) *
      item.quantity;

    const meal = {
      type: item.type,
      name: item.name,
      base: item.base,
      proteins: item.proteins,
      extraProtein: item.extraProtein,
      extraProteinPrice: item.extraProteinPrice,
      garnishes: item.garnishes,
      toppings: item.toppings,
      sauces: item.sauces,
      quantity: item.quantity,
      price: itemPrice,
    };
    return meal;
  });

  useEffect(() => {
    sessionStorage.setItem("Cart", JSON.stringify(cartItems));
  }, [cartItems]);

  useEffect(() => {
    const cartItems = sessionStorage.getItem("Cart");
    if (cartItems) {
      setCartItems(JSON.parse(cartItems));
    }
  }, []);

  useEffect(() => {
    if (location.pathname.includes("table")) {
      setIsClickAndCollect(false);
      setOrderType("dine-in");
    } else {
      setIsClickAndCollect(true);
      setOrderType("clickandcollect");
    }
  }, [location.pathname]);

  return (
    <ShoppingCartContext.Provider
      value={{
        cartItems,
        addToCart,
        updateItemCount,
        removeFromCart,
        clearCart,
        message,
        setMessage,
        selectedDate,
        setSelectedDate,
        selectedDay,
        setSelectedDay,
        isClickAndCollect,
        calculateTotalPrice,
        items,
        orderType,
      }}
    >
      {children}
    </ShoppingCartContext.Provider>
  );
}
