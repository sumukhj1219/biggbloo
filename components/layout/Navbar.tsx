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
    <nav className="z-50 w-full fixed inset-x-0 top-8 sm:top-16">
      <div className="max-w-xl w-full mx-3 sm:mx-auto flex items-center gap-6 sm:gap-10">
        {items.map((item) => {
          const isActive = pathname === item.url;

          return (
            <div
              key={item.url}
            >
              <Link
                href={item.url}
                className={`font-bold lowercase tracking-tight  text-sm sm:text-xl transition-colors duration-200 ${
                  isActive ? "text-primary" : "text-secondary hover:text-primary"
                }`}
              >
                {item.label}
              </Link>
            </div>
          );
        })}
      </div>
    </nav>
  );
};

export default Navbar;
