import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusPill } from "@/components/status-pill";
import { requireAdminPage } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type OrderDetailPageProps = {
  params: Promise<{
    orderId: string;
  }>;
};

const orderStatuses = [
  "draft",
  "pending_payment",
  "paid",
  "allocated",
  "partially_fulfilled",
  "fulfilled",
  "shipped",
  "delivered",
  "canceled",
  "refunded",
  "exception",
] as const;

const paymentStatuses = ["pending", "authorized", "captured", "failed", "refunded"] as const;

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
  await requireAdminPage("/admin/orders");

  const { orderId } = await params;
  const repo = getRepository();
  const [order, partners] = await Promise.all([repo.getOrderById(orderId), repo.listFulfillmentPartners()]);

  if (!order) {
    notFound();
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Order details</span>
        <h1>{order.orderNumber}</h1>
        <p>
          Customer {order.customerName} is currently in <strong>{order.status}</strong> and routed
          through {order.fulfillmentPartnerName}.
        </p>
        <div className="hero__actions">
          <StatusPill status={order.status} />
          <StatusPill status={order.paymentStatus} />
          <Link className="button button-secondary" href="/admin/orders">
            Back to orders
          </Link>
        </div>
      </section>

      <div className="admin-grid">
        <section className="panel">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Edit order</span>
              <h2>Change routing, payment state, or order notes</h2>
            </div>
          </div>
          <form className="form-grid" action={`/api/v1/admin/orders/${order.id}`} method="post">
            <input type="hidden" name="action" value="update" />

            <div className="field">
              <span>Customer name</span>
              <input name="customerName" defaultValue={order.customerName} required />
            </div>

            <div className="field">
              <span>Order status</span>
              <select name="status" defaultValue={order.status} required>
                {orderStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <span>Payment status</span>
              <select name="paymentStatus" defaultValue={order.paymentStatus} required>
                {paymentStatuses.map((status) => (
                  <option key={status} value={status}>
                    {status}
                  </option>
                ))}
              </select>
            </div>

            <div className="field">
              <span>Fulfillment partner</span>
              <select name="fulfillmentPartnerName" defaultValue={order.fulfillmentPartnerName} required>
                <option value={order.fulfillmentPartnerName}>{order.fulfillmentPartnerName}</option>
                {partners
                  .filter((partner) => partner.name !== order.fulfillmentPartnerName)
                  .map((partner) => (
                    <option key={partner.id} value={partner.name}>
                      {partner.name}
                    </option>
                  ))}
              </select>
            </div>

            <div className="field">
              <span>Destination</span>
              <input name="destination" defaultValue={order.destination} required />
            </div>

            <div className="field">
              <span>Order total</span>
              <input name="total" type="number" min="0" step="0.01" defaultValue={order.total} required />
            </div>

            <div className="field">
              <span>Shipping total</span>
              <input
                name="shippingTotal"
                type="number"
                min="0"
                step="0.01"
                defaultValue={order.shippingTotal}
                required
              />
            </div>

            <div className="field" style={{ gridColumn: "1 / -1" }}>
              <span>Notes</span>
              <textarea
                name="notes"
                rows={4}
                defaultValue={order.notes ?? ""}
                placeholder="Optional internal context, hold reason, or fulfillment instructions."
              />
            </div>

            <div className="hero__actions" style={{ gridColumn: "1 / -1" }}>
              <button className="button button-primary" type="submit">
                Save changes
              </button>
            </div>
          </form>
        </section>

        <aside className="stack-grid">
          <section className="panel">
            <span className="eyebrow">Quick actions</span>
            <h2>Route the order through common states</h2>
            <div className="queue-grid">
              {[
                { action: "allocate", label: "Mark allocated" },
                { action: "mark_paid", label: "Mark paid" },
                { action: "mark_shipped", label: "Mark shipped" },
                { action: "mark_exception", label: "Flag exception" },
                { action: "cancel", label: "Cancel order" },
                { action: "refund", label: "Refund order" },
              ].map((item) => (
                <form key={item.action} action={`/api/v1/admin/orders/${order.id}`} method="post">
                  <input type="hidden" name="action" value={item.action} />
                  <button className="button button-secondary" type="submit">
                    {item.label}
                  </button>
                </form>
              ))}
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">Order summary</span>
            <div className="stack-grid">
              <div className="stack-row">
                <span>Created</span>
                <strong>{formatDateTime(order.createdAt)}</strong>
              </div>
              <div className="stack-row">
                <span>Item count</span>
                <strong>{order.itemCount}</strong>
              </div>
              <div className="stack-row">
                <span>Order total</span>
                <strong>{formatCurrency(order.total)}</strong>
              </div>
              <div className="stack-row">
                <span>Shipping total</span>
                <strong>{formatCurrency(order.shippingTotal)}</strong>
              </div>
            </div>
          </section>

          <section className="panel">
            <span className="eyebrow">Line items</span>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Item</th>
                    <th>Qty</th>
                    <th>Unit</th>
                    <th>Total</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item) => (
                    <tr key={item.id}>
                      <td>
                        <strong>{item.productName}</strong>
                        <div className="deal-note" style={{ marginTop: "0.25rem" }}>
                          {item.variantName}
                        </div>
                      </td>
                      <td>{item.quantity}</td>
                      <td>{formatCurrency(item.unitPrice)}</td>
                      <td>{formatCurrency(item.lineTotal)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
