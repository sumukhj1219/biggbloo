import { Figtree, Anton } from "next/font/google";
import localFont from "next/font/local";

export const figtree = Figtree({
  variable: "--font-figtree",
  subsets: ["latin"],
});

export const anton = Anton({
  variable: "--font-anton",
  weight: "400",
  subsets: ["latin"],
});

// Same face the 3D scene's troika text loads from /fonts, for HTML that sits on top of it.
export const amatic = localFont({
  src: "../public/fonts/AmaticSC-Bold.ttf",
  weight: "700",
  variable: "--font-amatic",
});
