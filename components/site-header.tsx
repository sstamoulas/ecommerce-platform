import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="site-header">
      <div className="site-header__brand">
        <div className="brand-mark" aria-hidden="true">
          TL
        </div>
        <div>
          <span className="site-header__eyebrow">Textile commerce</span>
          <strong>Threadline</strong>
        </div>
      </div>
      <nav className="site-header__nav" aria-label="Primary">
        <Link href="/">Home</Link>
        <Link href="/store">Store</Link>
        <Link href="/track">Track</Link>
        <Link href="/admin">Admin</Link>
      </nav>
      <div className="site-header__meta">
        <span className="status-dot" />
        Ready for local 3PL routing
      </div>
    </header>
  );
}
