import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusPill } from "@/components/status-pill";
import { requireAdminPage } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

type ProductEditPageProps = {
  params: Promise<{
    productId: string;
  }>;
};

const unitTypes = ["yard", "meter", "roll", "bolt", "piece", "sample"] as const;
const visualTones = ["indigo", "sand", "sage", "amber", "ruby"] as const;
const statuses = ["draft", "active", "archived"] as const;

export default async function ProductEditPage({ params }: ProductEditPageProps) {
  await requireAdminPage(`/admin/products`);

  const { productId } = await params;
  const repo = getRepository();
  const [product, categories] = await Promise.all([repo.getProductById(productId), repo.listCategories()]);

  if (!product) {
    notFound();
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Edit product</span>
        <h1>{product.name}</h1>
        <p>Adjust pricing, content, inventory and merchandising for this textile listing.</p>
        <div className="hero__actions">
          <StatusPill status={product.status} />
          <span className="chip">{formatCurrency(product.price)}</span>
        </div>
      </section>

      <section className="panel">
        <form className="form-grid" action={`/api/v1/admin/products/${product.id}`} method="post">
          <input type="hidden" name="action" value="update" />

          <div className="field">
            <span>Name</span>
            <input name="name" defaultValue={product.name} required />
          </div>

          <div className="field">
            <span>Slug</span>
            <input name="slug" defaultValue={product.slug} required />
          </div>

          <div className="field">
            <span>Category</span>
            <select name="categorySlug" defaultValue={product.categorySlug} required>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>Material</span>
            <input name="material" defaultValue={product.material} required />
          </div>

          <div className="field">
            <span>Weave</span>
            <input name="weave" defaultValue={product.weave} required />
          </div>

          <div className="field">
            <span>Color</span>
            <input name="color" defaultValue={product.color} required />
          </div>

          <div className="field">
            <span>Width</span>
            <input name="width" defaultValue={product.width} required />
          </div>

          <div className="field">
            <span>Unit type</span>
            <select name="unitType" defaultValue={product.unitType}>
              {unitTypes.map((unitType) => (
                <option key={unitType} value={unitType}>
                  {unitType}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>Unit increment</span>
            <input name="unitIncrement" type="number" min="1" step="1" defaultValue={product.unitIncrement} required />
          </div>

          <div className="field">
            <span>Price</span>
            <input name="price" type="number" min="0" step="0.01" defaultValue={product.price} required />
          </div>

          <div className="field">
            <span>Compare-at price</span>
            <input
              name="compareAtPrice"
              type="number"
              min="0"
              step="0.01"
              defaultValue={product.compareAtPrice ?? ""}
            />
          </div>

          <div className="field">
            <span>Stock qty</span>
            <input name="stockQty" type="number" min="0" step="1" defaultValue={product.stockQty} required />
          </div>

          <div className="field">
            <span>Minimum order qty</span>
            <input name="minimumOrderQty" type="number" min="1" step="1" defaultValue={product.minimumOrderQty} required />
          </div>

          <div className="field">
            <span>Badge</span>
            <input name="badge" defaultValue={product.badge} required />
          </div>

          <div className="field">
            <span>ShipBob reference ID</span>
            <input
              name="shipbobReferenceId"
              defaultValue={product.shipbobReferenceId ?? ""}
              placeholder="TL-INDIGO-TWILL"
              title="Required for ShipBob fulfillment"
            />
          </div>

          <div className="field">
            <span>Visual tone</span>
            <select name="visualTone" defaultValue={product.visualTone}>
              {visualTones.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>Status</span>
            <select name="status" defaultValue={product.status}>
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <label className="field" style={{ alignItems: "start" }}>
            <span>Featured</span>
            <input name="featured" type="checkbox" defaultChecked={product.featured} />
          </label>

          <div className="field">
            <span>Specs, comma separated</span>
            <input name="specs" defaultValue={product.specs.join(", ")} />
          </div>

          <div className="field">
            <span>Deal note</span>
            <textarea name="dealNote" rows={3} defaultValue={product.dealNote ?? ""} />
          </div>

          <div className="field">
            <span>Description</span>
            <textarea name="description" rows={4} defaultValue={product.description} required />
          </div>

          <div className="hero__actions">
            <button className="button button-primary" type="submit">
              Save changes
            </button>
          </div>
        </form>
      </section>

      <section className="panel">
        <div className="hero__actions" style={{ justifyContent: "space-between" }}>
          <Link className="button button-secondary" href="/admin/products">
            Back to products
          </Link>
          <form action={`/api/v1/admin/products/${product.id}`} method="post">
            <input type="hidden" name="action" value="delete" />
            <button className="button button-secondary" type="submit">
              Delete product
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
