import { antonio } from "@/lib/fonts";
import React from "react";


const JustDoIt = () => {
  return (
    <div className="flex h-full w-full items-center justify-center p-2">
      <span
        className={`${antonio.className} whitespace-nowrap text-right text-4xl font-extrabold smallercase leading-none text-[#E9D927] sm:text-3xl`}
      >
        just do <br /> some <br /> creative <br /> shits.
      </span>
    </div>
  );
};

export default JustDoIt;
