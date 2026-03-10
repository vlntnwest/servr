import { useEffect, useState } from "react";
import axios from "axios";
import { formatPrice } from "../components/Utils";

const useStripeItems = (cartData) => {
  const [stripeItems, setStripeItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStripeItems = async () => {
      try {
        const items = await Promise.all(
          cartData.map(async (item) => {
            const res = await axios.get(
              `${process.env.REACT_APP_API_URL}api/item/${item.product_id}`
            );
            const product = res.data;

            const itemPrice =
              (formatPrice(product.price) +
                (item.extraProteinPrice
                  ? parseFloat(item.extraProteinPrice)
                  : 0)) *
              100;
            return {
              price_data: {
                currency: "eur",
                product_data: {
                  name: product.name,
                },
                unit_amount: parseInt(itemPrice.toFixed(0)),
              },
              quantity: item.quantity,
            };
          })
        );
        setStripeItems(items);
      } catch (error) {
        console.error("Erreur lors du fetch des items Stripe :", error);
      } finally {
        setLoading(false);
      }
    };

    if (cartData.length > 0) {
      fetchStripeItems();
    } else {
      setStripeItems([]);
      setLoading(false);
    }
  }, [cartData]);

  return { stripeItems, loading };
};

export default useStripeItems;
