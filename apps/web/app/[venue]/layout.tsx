"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

const tabs = [
  { href: "", label: "Tonight" },
  { href: "/drinks", label: "Drinks" },
  { href: "/bottles", label: "Bottles" },
  { href: "/recipes", label: "Recipes" },
  { href: `/ice`, label: 'Ice tracker' },
  { href: "/inventory", label: "Inventory" },
  { href: "/pnl", label: "P&L" },
  { href: "/check-in", label: "Check-In" },
  { href: "/settings", label: "Settings" },
{ href: `/fat-wash`, label: 'Fat Wash' },
];

export default function VenueLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const venue = params.venue as string;

  return (
    <div>
      <header className="header">
        <div className="header-left">
          <span className="logo">Visit</span>
          <div className="venue-switcher">
            <Link
              href="/newburgh"
              className={`venue-btn ${venue === "newburgh" ? "active" : ""}`}
            >
              Newburgh
            </Link>
            <Link
              href="/bushwick"
              className={`venue-btn ${venue === "bushwick" ? "active" : ""}`}
            >
              Bushwick
            </Link>
          </div>
        </div>
        <div className="header-right">
          <span className="role-badge">Admin</span>
        </div>
      </header>

      <nav className="nav">
        {tabs.map((tab) => {
          const fullHref = `/${venue}${tab.href}`;
          const isActive =
            tab.href === ""
              ? pathname === `/${venue}`
              : pathname.startsWith(fullHref);
          return (
            <Link
              key={tab.href}
              href={fullHref}
              className={isActive ? "active" : ""}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>

      <main className="main">{children}</main>
    </div>
  );
}
