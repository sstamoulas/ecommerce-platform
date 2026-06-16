import Link from "next/link";

import { ProductCard } from "@/components/product-card";
import { StatusPill } from "@/components/status-pill";
import { getRepository } from "@/lib/data";
import { formatDate } from "@/lib/utils";

export default async function StorePage() {
  const repo = getRepository();
  const [categories, products, activePromotions] = await Promise.all([
    repo.listCategories(),
    repo.listProducts(),
    repo.listPromotions({ status: "active" }),
  ]);

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Catalog</span>
        <h1>Textiles organized by hand, weight, and fulfillment readiness.</h1>
        <p>
          Every product card carries the textile details buyers actually need: material, weave,
          width, unit type, stock, and cut-to-order constraints.
        </p>
        <div className="chip-row">
          {categories.map((category) => (
            <span className="chip" key={category.id}>
              {category.name}
            </span>
          ))}
        </div>
      </section>

      <div className="store-layout">
        <section className="store-layout__main">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Available now</span>
              <h2>Full catalog for retail and wholesale buyers</h2>
            </div>
            <Link href="/track">Track shipment</Link>
          </div>

          <div className="product-grid">
            {products.map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>

        <aside className="panel">
          <span className="eyebrow">Buying notes</span>
          <h2>Textile-specific defaults</h2>
          <div className="stack-grid">
            <div className="stack-row">
              <span>Minimum order</span>
              <strong>2 yards or more on most lines</strong>
            </div>
            <div className="stack-row">
              <span>Fulfillment</span>
              <strong>Local 3PL or stockroom routing</strong>
            </div>
            <div className="stack-row">
              <span>Inventory policy</span>
              <strong>Reserve stock before payment capture</strong>
            </div>
            <div className="stack-row">
              <span>Promotion window</span>
              <strong>{formatDate("2026-06-30")}</strong>
            </div>
          </div>

          <div className="promo-stack">
            {activePromotions.map((promotion) => (
              <article className="promo-card" key={promotion.id}>
                <div className="promo-card__topline">
                  <StatusPill status={promotion.status} />
                  <span>{promotion.code}</span>
                </div>
                <strong>{promotion.discountSummary}</strong>
                <p>{promotion.appliesTo}</p>
              </article>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
