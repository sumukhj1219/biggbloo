import type { Metadata } from "next";
import HomePage from "@/layouts/home/HomePage";
import Footer from "@/components/common/Footer";
import Reveal from "@/components/common/Reveal";

export const metadata: Metadata = { alternates: { canonical: "/" } };

export default function Home() {
  return (
    <>
      <HomePage />
      {/* Home only. mt-auto sits on the wrapper: it is the body's flex child. */}
      <Reveal index={7} className="mt-auto">
        <Footer />
      </Reveal>
    </>
  );
}
