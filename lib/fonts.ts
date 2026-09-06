import { Antonio, Chakra_Petch, Inter, Rock_Salt } from "next/font/google";
import localFont from "next/font/local";

export const antonio = Antonio({
  variable: "--antonio",
  weight:"700"
})

export const chakraPetch = Chakra_Petch({
  variable: "--chakra-petch",
  weight: "700",
  subsets: ["latin"],
})

export const interExtraBold = Inter({
  variable: "--inter-extrabold",
  weight: "800",
  subsets: ["latin"],
})


export const rockSalt = Rock_Salt({
  variable: "--rock-salt",
  weight: "400"
})

export const fatCat = localFont({
  src: "../public/dafonts/Fat Kat - (Demo) hanscostudio.com.ttf",
  variable: "--fat-cat",
})
