import { antonio } from "@/lib/fonts";
import React from "react";

const Life = () => {
  return (
    <div className="flex h-full w-full items-center p-2">
      <div
        className={`${antonio.className} flex flex-col items-center whitespace-nowrap text-xl font-extrabold smallercase leading-none text-[#E9D927] sm:text-xl`}
      >
        <span>
          <span className="text-primary/50">gym</span> <span className="sm:text-2xl text-lg">7am</span>,
        </span>
        <span>
          <span className="text-primary/50">breakfast</span> <span>🍳protein</span>
        </span>
        <span>
          <span className="sm:text-2xl text-lg">working</span> <span className="text-primary/50">sde</span>
        </span>
        <span>
          <span>games</span>, <span className="text-primary/50">football</span>
        </span>
        <span>
          <span className="sm:text-3xl text-xl">creative</span> <span className="text-primary/50">22</span>
        </span>
      </div>
    </div>
  );
};

export default Life;
