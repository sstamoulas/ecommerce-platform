import Link from "next/link";
import type { ReactNode } from "react";

import { getAdminSessionFromCookies } from "@/lib/admin-auth";

const navItems = [
  { href: "/admin", label: "Overview" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/fulfillment", label: "Fulfillment" },
  { href: "/admin/shipments", label: "Shipments" },
  { href: "/admin/inventory", label: "Inventory" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/promotions", label: "Promotions" },
];

type AdminShellProps = {
  children: ReactNode;
};

export async function AdminShell({ children }: AdminShellProps) {
  const session = await getAdminSessionFromCookies();

  return (
    <div className="admin-shell">
      <aside className="admin-shell__sidebar">
        <div className="site-header__brand admin-shell__brand">
          <div className="brand-mark" aria-hidden="true">
            TL
          </div>
          <div>
            <span className="site-header__eyebrow">Operations</span>
            <strong>Threadline Admin</strong>
          </div>
        </div>
        <nav className="admin-shell__nav" aria-label="Admin navigation">
          {navItems.map((item) => (
            <Link href={item.href} key={item.href}>
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="admin-shell__panel">
          <span className="eyebrow">Sync status</span>
          <strong>3PL feeds healthy</strong>
          <p>Last shipment update processed 4 minutes ago.</p>
        </div>
        <div className="admin-shell__panel">
          <span className="eyebrow">{session ? "Signed in" : "Authentication"}</span>
          <strong>{session ? "Admin session active" : "Admin login required"}</strong>
          <p>
            {session
              ? "Protected pages and write routes are unlocked."
              : "Use the login page to unlock protected admin actions."}
          </p>
          {session ? (
            <form action="/api/v1/admin/session" method="post">
              <input type="hidden" name="action" value="logout" />
              <button className="button button-secondary" type="submit">
                Sign out
              </button>
            </form>
          ) : (
            <Link className="button button-secondary" href="/admin/login">
              Sign in
            </Link>
          )}
        </div>
      </aside>
      <div className="admin-shell__main">{children}</div>
    </div>
  );
}
