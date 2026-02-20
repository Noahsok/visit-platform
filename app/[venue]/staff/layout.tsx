"use client";

import Link from "next/link";
import { usePathname, useParams } from "next/navigation";
import { useSession, signOut } from "next-auth/react";

const allTabs = [
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
  const { data: session } = useSession();
  const role = session?.user?.role;
  const isAdmin = role === "owner" || role === "manager";

  // prep role does not see Check-In (no check-in tab in staff currently,
  // but filter is here if one gets added in the future)
  const tabs = allTabs;

  return (
    <div>
      <header className="header">
        <div className="header-left">
          <span className="logo">Visit</span>
          <span style={{ fontSize: "13px", color: "var(--text-muted)", textTransform: "capitalize" }}>{venue}</span>
        </div>
        <div className="header-right">
          {isAdmin && (
            <Link href={`/${venue}`} className="role-switch">
              ← Admin
            </Link>
          )}
          <span className="role-badge staff">Staff</span>
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
