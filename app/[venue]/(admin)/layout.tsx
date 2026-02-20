"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { signOut } from "next-auth/react";

const tabs = [
  { href: "", label: "Tonight" },
  { href: "/drinks", label: "Drinks" },
  { href: "/bottles", label: "Bottles" },
  { href: "/recipes", label: "Recipes" },
  { href: "/inventory", label: "Inventory" },
  { href: "/pnl", label: "P&L" },
  { href: "/check-in", label: "Check-In" },
  { href: "/ice", label: "Ice" },
  { href: "/settings", label: "Settings" },
];

export default function AdminLayout({
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
          <span style={{ fontSize: "13px", color: "var(--text-muted)", textTransform: "capitalize" }}>{venue}</span>
        </div>
        <div className="header-right">
          <Link href={`/${venue}/staff`} className="role-switch">
            Staff View →
          </Link>
          <span className="role-badge">Admin</span>
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="btn-small"
          >
            Sign out
          </button>
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
