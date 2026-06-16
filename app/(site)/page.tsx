import Link from "next/link";

import { MetricCard } from "@/components/metric-card";
import { ProductCard } from "@/components/product-card";
import { StatusPill } from "@/components/status-pill";
import { getRepository } from "@/lib/data";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default async function HomePage() {
  const repo = getRepository();

  const [featuredProducts, activePromotions, allProducts, allOrders, allShipments, partners] =
    await Promise.all([
      repo.listProducts({ featured: true }),
      repo.listPromotions({ status: "active" }),
      repo.listProducts(),
      repo.listOrders(),
      repo.listShipments(),
      repo.listFulfillmentPartners(),
    ]);

  const openOrders = allOrders.filter((order) =>
    ["draft", "pending_payment", "paid", "allocated", "partially_fulfilled", "exception"].includes(
      order.status
    )
  );

  const siteMetrics = {
    activeSkus: allProducts.filter((product) => product.status === "active").length,
    openOrders: openOrders.length,
    partnerCount: partners.length,
    onTimeShipRate: 97,
  };

  const recentShipments = allShipments.slice(0, 3);

  return (
    <div className="page-shell">
      <section className="hero">
        <div className="hero__copy">
          <span className="eyebrow">Textile commerce + operations</span>
          <h1>Sell textiles, run deals, and keep shipping visible end to end.</h1>
          <p className="hero__lede">
            Threadline is built for cut-to-order fabrics, local 3PL routing, and customer shipment
            tracking without losing sight of the catalog or the margin.
          </p>
          <div className="hero__actions">
            <Link className="button button-primary" href="/store">
              Open storefront
            </Link>
            <Link className="button button-secondary" href="/track/TXT-1048">
              Track shipment
            </Link>
          </div>
          <div className="metric-grid">
            <MetricCard
              title="Active SKUs"
              value={siteMetrics.activeSkus.toString()}
              caption="Listed and available to order"
            />
            <MetricCard
              title="Open orders"
              value={siteMetrics.openOrders.toString()}
              caption="Orders in the fulfillment pipeline"
            />
            <MetricCard
              title="3PL partners"
              value={siteMetrics.partnerCount.toString()}
              caption="Local fulfillment routes available"
            />
            <MetricCard
              title="On-time ship rate"
              value={`${siteMetrics.onTimeShipRate}%`}
              caption="Current tracked carrier performance"
            />
          </div>
        </div>

        <aside className="hero__panel panel">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Live fulfillment</span>
              <h2>TX-1048 is moving through East Harbor 3PL</h2>
            </div>
            <StatusPill status="in_transit" />
          </div>

          <div className="stack-grid">
            <div className="stack-row">
              <span>Carrier</span>
              <strong>UPS Ground</strong>
            </div>
            <div className="stack-row">
              <span>Estimated delivery</span>
              <strong>{formatDate("2026-06-13")}</strong>
            </div>
            <div className="stack-row">
              <span>Last scan</span>
              <strong>{formatDateTime("2026-06-10T08:41:00Z")}</strong>
            </div>
            <div className="stack-row">
              <span>Order value</span>
              <strong>{formatCurrency(294)}</strong>
            </div>
          </div>

          <div className="mini-shipments">
            {recentShipments.map((shipment) => (
              <article className="shipment-card" key={shipment.id}>
                <div className="shipment-card__topline">
                  <StatusPill status={shipment.status} />
                  <span>{shipment.trackingNumber}</span>
                </div>
                <strong>{shipment.carrier}</strong>
                <p>{shipment.destination}</p>
              </article>
            ))}
          </div>
        </aside>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Deals</span>
            <h2>Promotions built for textile buying patterns</h2>
          </div>
          <Link href="/store">See catalog</Link>
        </div>

        <div className="deal-grid">
          {activePromotions.map((promotion) => (
            <article className="deal-card" key={promotion.id}>
              <div className="deal-card__topline">
                <StatusPill status={promotion.status} label="Active" />
                <span>{formatDate(promotion.validThrough)}</span>
              </div>
              <h3>{promotion.name}</h3>
              <p>{promotion.description}</p>
              <strong>{promotion.discountSummary}</strong>
              <div className="deal-card__code">{promotion.code}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Featured textiles</span>
            <h2>Products ready for retail and wholesale</h2>
          </div>
          <Link href="/store">Browse all</Link>
        </div>

        <div className="product-grid">
          {featuredProducts.map((product) => (
            <ProductCard key={product.id} product={product} />
          ))}
        </div>
      </section>

      <section className="content-section">
        <div className="panel-grid">
          <article className="panel">
            <span className="eyebrow">Storefront</span>
            <h3>Category-aware product pages</h3>
            <p>
              Textiles are shown with material, weave, width, unit, and minimum order rules so
              customers know what they are buying before checkout.
            </p>
          </article>
          <article className="panel">
            <span className="eyebrow">Fulfillment</span>
            <h3>Rules for local 3PL routing</h3>
            <p>
              Orders can route by stock location, partner capability, or manual override when an
              exception needs attention.
            </p>
          </article>
          <article className="panel">
            <span className="eyebrow">Tracking</span>
            <h3>Shipment visibility for buyers</h3>
            <p>
              Customers see label creation, carrier scans, delivery milestones, and exceptions in
              one place instead of waiting on email threads.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
