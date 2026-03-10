import type { Metadata } from "next";
import "./globals.css";
import { CartProvider } from "@/contexts/cart-context";

export const metadata: Metadata = {
  title: "Pokey Bar",
  description: "Commander en ligne chez Pokey Bar",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
