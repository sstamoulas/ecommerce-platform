import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { requireAdminPage } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";
import { formatCurrency } from "@/lib/utils";

const unitTypes = ["yard", "meter", "roll", "bolt", "piece", "sample"] as const;
const visualTones = ["indigo", "sand", "sage", "amber", "ruby"] as const;
const statuses = ["draft", "active", "archived"] as const;

export default async function AdminProductsPage() {
  await requireAdminPage("/admin/products");

  const repo = getRepository();
  const [products, categories] = await Promise.all([repo.listProducts(), repo.listCategories()]);

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Products</span>
        <h1>Create, review, and update textile listings.</h1>
        <p>Keep the catalog tight so promotions, inventory, and fulfillment all stay in sync.</p>
      </section>

      <section className="panel">
        <div className="panel__heading">
          <div>
            <span className="eyebrow">Create product</span>
            <h2>Add a new textile to the storefront</h2>
          </div>
        </div>

        <form className="form-grid" action="/api/v1/admin/products" method="post">
          <input type="hidden" name="action" value="create" />

          <div className="field">
            <span>Name</span>
            <input name="name" required />
          </div>

          <div className="field">
            <span>Slug</span>
            <input name="slug" required />
          </div>

          <div className="field">
            <span>Category</span>
            <select name="categorySlug" required defaultValue={categories[0]?.slug ?? ""}>
              {categories.map((category) => (
                <option key={category.id} value={category.slug}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>Material</span>
            <input name="material" required />
          </div>

          <div className="field">
            <span>Weave</span>
            <input name="weave" required />
          </div>

          <div className="field">
            <span>Color</span>
            <input name="color" required />
          </div>

          <div className="field">
            <span>Width</span>
            <input name="width" required />
          </div>

          <div className="field">
            <span>Unit type</span>
            <select name="unitType" defaultValue="yard">
              {unitTypes.map((unitType) => (
                <option key={unitType} value={unitType}>
                  {unitType}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>Unit increment</span>
            <input name="unitIncrement" type="number" min="1" step="1" defaultValue="1" required />
          </div>

          <div className="field">
            <span>Price</span>
            <input name="price" type="number" min="0" step="0.01" required />
          </div>

          <div className="field">
            <span>Compare-at price</span>
            <input name="compareAtPrice" type="number" min="0" step="0.01" />
          </div>

          <div className="field">
            <span>Stock qty</span>
            <input name="stockQty" type="number" min="0" step="1" required />
          </div>

          <div className="field">
            <span>Minimum order qty</span>
            <input name="minimumOrderQty" type="number" min="1" step="1" defaultValue="1" required />
          </div>

          <div className="field">
            <span>Badge</span>
            <input name="badge" required />
          </div>

          <div className="field">
            <span>ShipBob reference ID</span>
            <input
              name="shipbobReferenceId"
              placeholder="TL-INDIGO-TWILL"
              title="Required for ShipBob fulfillment"
            />
          </div>

          <div className="field">
            <span>Visual tone</span>
            <select name="visualTone" defaultValue="indigo">
              {visualTones.map((tone) => (
                <option key={tone} value={tone}>
                  {tone}
                </option>
              ))}
            </select>
          </div>

          <div className="field">
            <span>Status</span>
            <select name="status" defaultValue="active">
              {statuses.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          <label className="field" style={{ alignItems: "start" }}>
            <span>Featured</span>
            <input name="featured" type="checkbox" defaultChecked />
          </label>

          <div className="field">
            <span>Specs, comma separated</span>
            <input name="specs" placeholder="Cut-to-order, Reactive dye, Pre-shrunk" />
          </div>

          <div className="field">
            <span>Deal note</span>
            <textarea name="dealNote" rows={3} placeholder="Optional merchandising note" />
          </div>

          <div className="field">
            <span>Description</span>
            <textarea name="description" rows={4} required />
          </div>

          <button className="button button-primary" type="submit">
            Create product
          </button>
        </form>
      </section>

      <section className="panel">
        <div className="panel__heading">
          <div>
            <span className="eyebrow">Catalog</span>
            <h2>Current textile listings</h2>
          </div>
        </div>

        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Product</th>
                <th>Category</th>
                <th>Status</th>
                <th>Featured</th>
                <th>Price</th>
                <th>Stock</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td>
                    <strong>{product.name}</strong>
                  </td>
                  <td>{product.categoryName}</td>
                  <td>
                    <StatusPill status={product.status} />
                  </td>
                  <td>{product.featured ? "Yes" : "No"}</td>
                  <td>{formatCurrency(product.price)}</td>
                  <td>{product.stockQty.toLocaleString()}</td>
                  <td>
                    <Link className="button button-secondary button-small" href={`/admin/products/${product.id}`}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
