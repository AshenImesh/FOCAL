"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Icon } from "@/components/icons";

export type NavItem = { href: string; label: string; icon: string; active: string };

function isActive(pathname: string, item: NavItem): boolean {
  if (item.href === "/") return pathname === "/";
  if (item.active) return pathname === item.href || pathname.startsWith("/" + item.active);
  return pathname === item.href || pathname.startsWith(item.href);
}

export function NavLinks({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <div className="nav-links">
      {items.map((n) => (
        <Link key={n.href} href={n.href} className={isActive(pathname, n) ? "active" : undefined}>
          {n.label}
        </Link>
      ))}
    </div>
  );
}

export function BottomNav({ items }: { items: NavItem[] }) {
  const pathname = usePathname();
  return (
    <nav className="bottom">
      <div className="bottom-inner">
        {items.map((n) => (
          <Link key={n.href} href={n.href} className={isActive(pathname, n) ? "active" : undefined}>
            <Icon name={n.icon} size={20} />
            {n.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}