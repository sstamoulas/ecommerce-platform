import Link from "next/link";
import { redirect } from "next/navigation";

import { getAdminSessionFromCookies, sanitizeInternalPath } from "@/lib/admin-auth";

type LoginPageProps = {
  searchParams: Promise<{
    next?: string;
    error?: string;
  }>;
};

export default async function AdminLoginPage({ searchParams }: LoginPageProps) {
  const { next, error } = await searchParams;
  const session = await getAdminSessionFromCookies();
  const nextPath = sanitizeInternalPath(next, "/admin");

  if (session) {
    redirect(nextPath);
  }

  return (
    <div className="page-shell">
      <section className="panel" style={{ maxWidth: "42rem" }}>
        <span className="eyebrow">Admin access</span>
        <h1>Sign in to manage products, orders, and fulfillment.</h1>
        <p>
          Use the admin password configured in your environment to unlock protected pages and write routes.
        </p>

        {error ? (
          <p className="deal-note">Invalid credentials. Check `ADMIN_PASSWORD` and try again.</p>
        ) : null}

        <form action="/api/v1/admin/session" method="post" className="stack-grid" style={{ gap: "1rem" }}>
          <input type="hidden" name="action" value="login" />
          <input type="hidden" name="next" value={nextPath} />

          <label className="stack-row">
            <span>Password</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="text-input"
            />
          </label>

          <button className="button button-primary" type="submit">
            Sign in
          </button>
        </form>

        <div className="hero__actions" style={{ marginTop: "1rem" }}>
          <Link className="button button-secondary" href="/">
            Back to storefront
          </Link>
        </div>
      </section>
    </div>
  );
}
