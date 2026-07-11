"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "SAC" },
  { href: "/equipamentos", label: "HC" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 bg-surface border border-border rounded-xl p-1.5 w-fit">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "brand-gradient text-white px-5 py-2 rounded-lg text-sm font-semibold"
                : "px-5 py-2 rounded-lg text-sm font-medium text-text hover:bg-surface-hover transition-colors"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
