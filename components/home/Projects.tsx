import { rockSalt } from "@/lib/fonts";
import React from "react";

const Projects = () => {
  return (
    <div className="w-full my-3 h-40  cursor-pointer rounded-3xl p-4 bg-black flex items-center relative ring-4 sm:ring-8 ring-neutral-900">
      <span className={`text-4xl sm:text-5xl text-primary z-10 ${rockSalt.className}`}>
        #projects
      </span>
      <img src={"/app/elon.png"} className="absolute right-0 h-40 rounded-xl" alt="" />
    </div>
  );
};

export default Projects;
