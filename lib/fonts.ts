import { Figtree, Anton, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

export const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

export const amatic = localFont({
  src: "../public/fonts/AmaticSC-Bold.ttf",
  weight: "700",
  variable: "--font-amatic",
});
