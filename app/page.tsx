import type { Metadata } from "next";
import HomePage from "@/layouts/home/HomePage";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return <HomePage />;
}
