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
    label: "projects",
    url: "/projects",
  },
];

const Navbar = () => {
  const pathname = usePathname();

  return (
    <nav className="z-50 w-full mx-auto absolute flex items-center justify-center top-8 sm:top-16">
      <div className="flex items-center justify-center h-10 sm:h-14 gap-6 sm:gap-10 px-6 sm:px-8 max-w-xl w-full mx-3 sm:mx-auto">
        {items.map((item) => {
          const isActive = pathname === item.url;

          return (
            <Link
              key={item.url}
              href={item.url}
              className={`font-bold lowercase tracking-tight leading-none text-sm sm:text-xl transition-colors duration-200 ${
                isActive ? "text-primary" : "text-secondary hover:text-primary"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
