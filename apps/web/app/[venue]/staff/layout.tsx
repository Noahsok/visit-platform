"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";

const tabs = [
  { href: "", label: "Drink Bible" },
  { href: "/recipes", label: "Recipes" },
  { href: "/ice", label: "Ice Tracker" },
];

export default function StaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const params = useParams();
  const venue = params.venue as string;
  const base = `/${venue}/staff`;

  return (
    <div>
      <header className="header">
        <div className="header-left">
          <span className="logo">Visit</span>
          <div className="venue-switcher">
            <Link
              href="/newburgh/staff"
              className={`venue-btn ${venue === "newburgh" ? "active" : ""}`}
            >
              Newburgh
            </Link>
            <Link
              href="/bushwick/staff"
              className={`venue-btn ${venue === "bushwick" ? "active" : ""}`}
            >
              Bushwick
            </Link>
          </div>
        </div>
        <div className="header-right">
          <Link href={`/${venue}`} className="role-switch">
            ← Admin
          </Link>
          <span className="role-badge staff">Staff</span>
        </div>
      </header>

      <nav className="nav">
        {tabs.map((tab) => {
          const fullHref = `${base}${tab.href}`;
          const isActive =
            tab.href === ""
              ? pathname === base || pathname === base + "/"
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
