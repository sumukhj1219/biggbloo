"use client";

import React from "react";
import dynamic from "next/dynamic";
import House from "./House";
const DynamicLayout = dynamic(() => import("./Layout"), { ssr: false });

interface MainProps {
  active: boolean;
  setActive: React.Dispatch<React.SetStateAction<boolean>>;
}

const Main = ({ active, setActive }: MainProps) => {
  return (
    <>
      <button className="relative z-60" onClick={() => setActive((prev) => !prev)}>Switch</button>
      {active && (
        <DynamicLayout>
          <House />
        </DynamicLayout>
      )}
    </>
  );
};

export default Main;
