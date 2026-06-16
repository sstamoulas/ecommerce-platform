import { MetricCard } from "@/components/metric-card";
import { StatusPill } from "@/components/status-pill";
import { requireAdminPage } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function AdminHomePage() {
  await requireAdminPage("/admin");

  const repo = getRepository();

  const [orders, shipments, fulfillmentPartners, products, fulfillmentRequests] = await Promise.all([
    repo.listOrders(),
    repo.listShipments(),
    repo.listFulfillmentPartners(),
    repo.listProducts(),
    repo.listFulfillmentRequests(),
  ]);

  const openOrders = orders.filter((order) =>
    ["draft", "pending_payment", "paid", "allocated", "partially_fulfilled", "exception"].includes(
      order.status
    )
  );

  const siteMetrics = {
    openOrders: openOrders.length,
    activeSkus: products.filter((product) => product.status === "active").length,
    openRequests: fulfillmentRequests.filter((request) =>
      ["queued", "sent", "accepted"].includes(request.status)
    ).length,
  };

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Admin overview</span>
        <h1>Control products, deals, inventory, and fulfillment from one console.</h1>
        <p>
          The admin surface stays close to the operational reality: open orders, partner capacity,
          stock levels, and shipment exceptions.
        </p>
      </section>

      <div className="metric-grid">
        <MetricCard
          title="Open orders"
          value={siteMetrics.openOrders.toString()}
          caption="Orders needing fulfillment or review"
        />
        <MetricCard
          title="Active SKUs"
          value={siteMetrics.activeSkus.toString()}
          caption="Products currently available for sale"
        />
        <MetricCard
          title="Dispatch queue"
          value={siteMetrics.openRequests.toString()}
          caption="Requests waiting on a 3PL response"
        />
        <MetricCard
          title="In transit"
          value={shipments.filter((shipment) => shipment.status === "in_transit").length.toString()}
          caption="Shipments currently on the move"
        />
        <MetricCard
          title="Exceptions"
          value={shipments.filter((shipment) => shipment.status === "exception").length.toString()}
          caption="Cases needing immediate attention"
        />
        <MetricCard
          title="Gross order value"
          value={formatCurrency(orders.reduce((sum, order) => sum + order.total, 0))}
          caption="Current sample order volume"
        />
      </div>

      <div className="admin-grid">
        <section className="panel">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Fulfillment queue</span>
              <h2>Orders moving through the pipeline</h2>
            </div>
          </div>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order</th>
                  <th>Customer</th>
                  <th>Status</th>
                  <th>Partner</th>
                  <th>Total</th>
                </tr>
              </thead>
              <tbody>
                {openOrders.slice(0, 4).map((order) => (
                  <tr key={order.id}>
                    <td>{order.orderNumber}</td>
                    <td>{order.customerName}</td>
                    <td>
                      <StatusPill status={order.status} />
                    </td>
                    <td>{order.fulfillmentPartnerName}</td>
                    <td>{formatCurrency(order.total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="panel">
          <span className="eyebrow">Partner status</span>
          <h2>Local 3PL connections</h2>
          <div className="queue-grid">
            {fulfillmentPartners.map((partner) => (
              <article className="queue-card" key={partner.id}>
                <div className="queue-card__topline">
                  <StatusPill status={partner.status} />
                  <span>{partner.integrationType}</span>
                </div>
                <strong>{partner.name}</strong>
                <p>{partner.turnaround}</p>
                <span className="queue-card__meta">{partner.region}</span>
              </article>
            ))}
          </div>
          <div className="stack-grid">
            <div className="stack-row">
              <span>Last sync</span>
              <strong>{formatDateTime("2026-06-16T13:54:00Z")}</strong>
            </div>
            <div className="stack-row">
              <span>Dispatch queue</span>
              <strong>{siteMetrics.openRequests} open requests</strong>
            </div>
            <div className="stack-row">
              <span>Inventory holds</span>
              <strong>Protect stock before capture</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
