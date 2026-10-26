import { Plus_Jakarta_Sans, Anton, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";

export const jakartaSans = Plus_Jakarta_Sans({
  variable: "--font-jakarta-sans",
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
