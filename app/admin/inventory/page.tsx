import { getRepository } from "@/lib/data";
import { requireAdminPage } from "@/lib/admin-auth";

export default async function AdminInventoryPage() {
  await requireAdminPage("/admin/inventory");

  const repo = getRepository();
  const [inventoryLocations, inventoryLevels] = await Promise.all([
    repo.listInventoryLocations(),
    repo.listInventoryLevels(),
  ]);

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Inventory</span>
        <h1>Track stock by location, reserved quantity, and available supply.</h1>
        <p>Inventory is split by product, location, and fulfillment partner so routing stays honest.</p>
      </section>

      <div className="panel-grid">
        {inventoryLocations.map((location) => {
          const rows = inventoryLevels.filter((level) => level.inventoryLocationId === location.id);
          const available = rows.reduce((sum, level) => sum + level.availableQty, 0);

          return (
            <article className="panel" key={location.id}>
              <span className="eyebrow">{location.type}</span>
              <h2>{location.name}</h2>
              <div className="stack-grid">
                <div className="stack-row">
                  <span>Region</span>
                  <strong>{location.region}</strong>
                </div>
                <div className="stack-row">
                  <span>Available units</span>
                  <strong>{available.toLocaleString()}</strong>
                </div>
                <div className="stack-row">
                  <span>Contact</span>
                  <strong>{location.contact}</strong>
                </div>
              </div>
              <div className="inventory-list">
                {rows.map((row) => (
                  <div className="inventory-list__item" key={row.id}>
                    <div>
                      <strong>{row.productName}</strong>
                      <p>{row.variantName}</p>
                    </div>
                    <div className="inventory-list__numbers">
                      <span>{row.availableQty.toLocaleString()} available</span>
                      <span>{row.reservedQty.toLocaleString()} reserved</span>
                    </div>
                  </div>
                ))}
              </div>
            </article>
          );
        })}
      </div>

      <section className="panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Inventory levels</span>
            <h2>Every stock movement is measured before fulfillment</h2>
          </div>
        </div>
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Location</th>
                <th>Product</th>
                <th>Variant</th>
                <th>On hand</th>
                <th>Reserved</th>
                <th>Available</th>
                <th>Low stock threshold</th>
              </tr>
            </thead>
            <tbody>
              {inventoryLevels.map((level) => (
                <tr key={level.id}>
                  <td>{level.inventoryLocationName}</td>
                  <td>{level.productName}</td>
                  <td>{level.variantName}</td>
                  <td>{level.onHandQty.toLocaleString()}</td>
                  <td>{level.reservedQty.toLocaleString()}</td>
                  <td>{level.availableQty.toLocaleString()}</td>
                  <td>{level.lowStockThreshold.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="panel__footnote">
          Use these numbers to decide whether to split stock between the stockroom and a local 3PL.
        </p>
      </section>
    </div>
  );
}
