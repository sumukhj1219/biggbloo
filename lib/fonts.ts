import { Antonio, Rock_Salt } from "next/font/google";
import localFont from "next/font/local";

export const antonio = Antonio({
  variable: "--antonio",
  weight:"700"
})


export const rockSalt = Rock_Salt({
  variable: "--rock-salt",
  weight: "400"
})

export const fatCat = localFont({
  src: "../public/dafonts/Fat Kat - (Demo) hanscostudio.com.ttf",
  variable: "--fat-cat",
})
