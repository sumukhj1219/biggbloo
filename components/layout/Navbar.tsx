"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";

const items = [
  {
    label: "home",
    url: "/",
  },
  {
    label: "Gallery",
    url: "/gallery",
  },
  {
    label: "Work",
    url: "/work",
  },
  {
    label: "Gears",
    url: "/gears",
  },
];

const Navbar = () => {
  const pathname = usePathname();

  return (
    <nav className=" max-w-xl w-full mx-3 sm:mx-auto z-50 flex items-center gap-6 sm:gap-10">
      {items.map((item) => {
        const isActive = pathname === item.url;

        return (
          <div
            key={item.url}
          >
            <Link
              href={item.url}
              className={`font-bold lowercase tracking-tight  text-sm sm:text-base transition-colors duration-200 ${
                isActive ? "text-primary" : "text-secondary hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          </div>
        );
      })}
    </nav>
  );
};

export default Navbar;
