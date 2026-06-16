import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { getRepository } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

type ProductPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function ProductPage({ params }: ProductPageProps) {
  const repo = getRepository();
  const { slug } = await params;
  const [product, promotions] = await Promise.all([
    repo.getProductBySlug(slug),
    repo.listPromotions({ status: "active" }),
  ]);

  if (!product) {
    return (
      <div className="page-shell">
        <section className="panel empty-state">
          <span className="eyebrow">Not found</span>
          <h1>This textile is not in the current catalog.</h1>
          <p>Check the storefront for active products or add the item in the admin catalog flow.</p>
          <Link className="button button-primary" href="/store">
            Back to catalog
          </Link>
        </section>
      </div>
    );
  }

  const activePromotion = promotions.find((promotion) => promotion.status === "active");

  return (
    <div className="page-shell">
      <section className="detail-hero">
        <div className="detail-visual panel" data-tone={product.visualTone}>
          <span className="product-card__badge">{product.badge}</span>
          <div className="detail-visual__mark" aria-hidden="true" />
        </div>

        <div className="detail-summary panel">
          <span className="eyebrow">{product.categoryName}</span>
          <h1>{product.name}</h1>
          <p>{product.description}</p>

          <div className="detail-price">
            <strong>{formatCurrency(product.price)}</strong>
            {product.compareAtPrice ? <s>{formatCurrency(product.compareAtPrice)}</s> : null}
            <StatusPill status={product.stockQty > 100 ? "active" : "pending"} label="In stock" />
          </div>

          <div className="hero__actions">
            <Link className="button button-primary" href="/admin">
              Route fulfillment
            </Link>
            <Link className="button button-secondary" href="/store">
              Back to catalog
            </Link>
          </div>

          {product.dealNote ? <p className="deal-note">{product.dealNote}</p> : null}
        </div>
      </section>

      <section className="detail-grid">
        <article className="panel">
          <span className="eyebrow">Textile profile</span>
          <h2>Specification details buyers rely on</h2>
          <ul className="spec-list spec-list--detail">
            <li>Material: {product.material}</li>
            <li>Weave: {product.weave}</li>
            <li>Color: {product.color}</li>
            <li>Width: {product.width}</li>
            <li>Unit type: {product.unitType}</li>
            <li>Minimum order: {product.minimumOrderQty} {product.unitType}s</li>
          </ul>
        </article>

        <article className="panel">
          <span className="eyebrow">Fulfillment behavior</span>
          <h2>Configured for local routing and cut-to-order</h2>
          <div className="stack-grid">
            <div className="stack-row">
              <span>Stock policy</span>
              <strong>{product.stockQty.toLocaleString()} units tracked in inventory</strong>
            </div>
            <div className="stack-row">
              <span>Checkout rule</span>
              <strong>Respect unit increments and minimum order constraints</strong>
            </div>
            <div className="stack-row">
              <span>Partner routing</span>
              <strong>Ship from the location with the best available stock</strong>
            </div>
            <div className="stack-row">
              <span>Promotions</span>
              <strong>{activePromotion?.name ?? "No active promotion"}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  );
}
