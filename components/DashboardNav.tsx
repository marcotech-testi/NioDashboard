"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const LINKS = [
  { href: "/", label: "Atendimento" },
  { href: "/equipamentos", label: "Equipamentos" },
];

export function DashboardNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 card p-1 w-fit">
      {LINKS.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={
              active
                ? "brand-gradient text-white px-3 py-1.5 rounded-lg text-sm font-medium"
                : "px-3 py-1.5 rounded-lg text-sm text-text-muted hover:text-text transition-colors"
            }
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
