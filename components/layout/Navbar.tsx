"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import React, { useEffect, useState } from "react";

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
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 0);
    const onAppScroll = (e: Event) => setScrolled((e as CustomEvent<boolean>).detail);

    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("app-scroll", onAppScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("app-scroll", onAppScroll);
    };
  }, [pathname]);

  return (
    <nav className="z-50 w-full mx-auto fixed flex items-center justify-center top-8 sm:top-16">
      <div className="relative max-w-xl w-full mx-3 sm:mx-auto">
        <div
          aria-hidden
          className={`pointer-events-none absolute inset-0 -z-10 rounded-full backdrop-blur-md transition-opacity duration-300 ${
            scrolled ? "opacity-100" : "opacity-0"
          }`}
        />
        <div className="flex items-center justify-center h-10 sm:h-14 gap-6 sm:gap-10 px-6 sm:px-8">
          {items.map((item) => {
            const isActive = pathname === item.url;

            return (
              <div
                key={item.url}
              >
                <Link
                  href={item.url}
                  className={`font-bold lowercase tracking-tight leading-none text-sm sm:text-xl transition-colors duration-200 ${
                    isActive ? "text-primary" : "text-secondary hover:text-primary"
                  }`}
                >
                  {item.label}
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
