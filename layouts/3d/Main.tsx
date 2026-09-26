"use client";

import React from "react";
import dynamic from "next/dynamic";
import { useLayoutStore } from "@/store/useLayoutStore";
import House from "./House";
const DynamicLayout = dynamic(() => import("./Layout"), { ssr: false });

const Main = () => {
  const active = useLayoutStore((state) => state.active);
  const fading = useLayoutStore((state) => state.fading);

  if (!active) return null;

  return (
    <DynamicLayout fading={fading}>
      <House />
    </DynamicLayout>
  );
};

export default Main;
