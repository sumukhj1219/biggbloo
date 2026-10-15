"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const links = [
  { label: "Home", href: "/" },
  { label: "Writings", href: "/writings" },
];

const Navbar = () => {
  const pathname = usePathname();

  return (
    <nav aria-label="Main" className="mb-8 sm:mb-10">
      <div className="flex items-center justify-between">
        <ul className="flex flex-wrap items-center  gap-x-5 gap-y-1 text-sm sm:text-lg">
          {links.map(({ label, href }) => {
            const isActive =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={isActive ? "page" : undefined}
                  className={cn(
                    "transition-colors hover:text-foreground",
                    isActive ? "text-foreground" : "text-muted-foreground/60",
                  )}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
