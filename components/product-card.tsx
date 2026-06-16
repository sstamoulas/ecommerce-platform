import Link from "next/link";

import type { Product } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

type ProductCardProps = {
  product: Product;
};

export function ProductCard({ product }: ProductCardProps) {
  return (
    <article className="product-card" data-tone={product.visualTone}>
      <div className="product-card__visual">
        <div className="product-card__badge">{product.badge}</div>
        <div className="product-card__swatch" aria-hidden="true" />
      </div>
      <div className="product-card__body">
        <div className="product-card__meta">
          <span>{product.categoryName}</span>
          <span>{product.width}</span>
        </div>
        <h3>{product.name}</h3>
        <p>{product.description}</p>
        <ul className="spec-list">
          {product.specs.map((spec) => (
            <li key={spec}>{spec}</li>
          ))}
        </ul>
        <div className="price-row">
          <div>
            <strong>{formatCurrency(product.price)}</strong>
            <span>{product.unitType} / unit</span>
          </div>
          {product.compareAtPrice ? <s>{formatCurrency(product.compareAtPrice)}</s> : null}
        </div>
        <div className="product-card__footer">
          <span className="stock-label">{product.stockQty.toLocaleString()} in stock</span>
          <Link className="button button-secondary button-small" href={`/store/${product.slug}`}>
            View details
          </Link>
        </div>
        {product.dealNote ? <p className="deal-note">{product.dealNote}</p> : null}
      </div>
    </article>
  );
}
