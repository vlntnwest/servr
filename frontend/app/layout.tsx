import type { Metadata } from "next";
import { DM_Sans } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/cart-context";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Servr - Commander en ligne",
  description: "Commander en ligne",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr" className={dmSans.variable}>
      <body>
        <CartProvider>{children}</CartProvider>
      </body>
    </html>
  );
}
