import type { Metadata } from "next";
import { DM_Sans, Archivo_Black, Archivo } from "next/font/google";
import "./globals.css";
import { CartProvider } from "@/contexts/cart-context";
import { UserProvider } from "@/contexts/user-context";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const archivoBlack = Archivo_Black({
  weight: "400",
  subsets: ["latin"],
  variable: "--font-archivo-black",
  display: "swap",
});

const archivoItalic = Archivo({
  subsets: ["latin"],
  style: ["italic"],
  weight: ["900"],
  variable: "--font-archivo-italic",
  display: "swap",
});

export const metadata: Metadata = {
  title: "My Spots - Commander en ligne",
  description: "Commander en ligne",
  robots: { index: false, follow: false },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="fr"
      className={`${dmSans.variable} ${archivoBlack.variable} ${archivoItalic.variable}`}
    >
      <body>
        <UserProvider>
          <CartProvider>{children}</CartProvider>
        </UserProvider>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
