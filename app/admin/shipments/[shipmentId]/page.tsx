import Link from "next/link";
import { notFound } from "next/navigation";

import { StatusPill } from "@/components/status-pill";
import { Timeline } from "@/components/timeline";
import { requireAdminPage } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

type ShipmentDetailPageProps = {
  params: Promise<{
    shipmentId: string;
  }>;
};

const eventStatuses = [
  "pending",
  "label_created",
  "packed",
  "shipped",
  "in_transit",
  "out_for_delivery",
  "delivered",
  "canceled",
  "exception",
  "returned",
] as const;

const eventSources = ["3pl", "carrier", "admin", "customer_service", "system"] as const;

export default async function ShipmentDetailPage({ params }: ShipmentDetailPageProps) {
  await requireAdminPage("/admin/shipments");

  const { shipmentId } = await params;
  const repo = getRepository();
  const shipment = await repo.getShipmentById(shipmentId);

  if (!shipment) {
    notFound();
  }

  const shipmentOrder = shipment.orderId ? await repo.getOrderById(shipment.orderId) : undefined;

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Shipment details</span>
        <h1>{shipment.trackingNumber}</h1>
        <p>
          Order {shipment.orderNumber} is routed through {shipment.partnerName} for{" "}
          {shipment.destination}.
        </p>
        <div className="hero__actions">
          <StatusPill status={shipment.status} />
          <span className="chip">
            {shipment.carrier} {shipment.serviceLevel}
          </span>
          <Link className="button button-secondary" href="/admin/shipments">
            Back to shipments
          </Link>
        </div>
      </section>

      <div className="admin-grid">
        <div className="stack-grid">
          <Timeline shipment={shipment} />

          <section className="panel">
            <span className="eyebrow">Exception workflow</span>
            <h2>Resolve carrier issues with tracked events</h2>
            <div className="queue-grid">
              {[
                { action: "mark_exception", label: "Flag exception", status: "exception", message: "Shipment flagged for review." },
                { action: "resolve_exception", label: "Resolve exception", status: "in_transit", message: "Exception resolved and shipment resumed." },
                { action: "mark_shipped", label: "Mark shipped", status: "shipped", message: "Shipment handed to the carrier." },
                { action: "mark_out_for_delivery", label: "Out for delivery", status: "out_for_delivery", message: "Shipment is out for delivery." },
                { action: "mark_delivered", label: "Mark delivered", status: "delivered", message: "Shipment delivered successfully." },
                { action: "mark_returned", label: "Mark returned", status: "returned", message: "Shipment returned to sender." },
              ].map((item) => (
                <form key={item.action} action={`/api/v1/admin/shipments/${shipment.id}`} method="post">
                  <input type="hidden" name="action" value={item.action} />
                  <input type="hidden" name="eventStatus" value={item.status} />
                  <input type="hidden" name="message" value={item.message} />
                  <input type="hidden" name="source" value="admin" />
                  <button className="button button-secondary" type="submit">
                    {item.label}
                  </button>
                </form>
              ))}
            </div>
          </section>
        </div>

        <aside className="stack-grid">
          <section className="panel">
            <span className="eyebrow">Add event</span>
            <h2>Record a custom shipment update</h2>
            <form className="form-grid" action={`/api/v1/admin/shipments/${shipment.id}`} method="post">
              <input type="hidden" name="action" value="append_event" />

              <div className="field">
                <span>Status</span>
                <select name="eventStatus" defaultValue={shipment.status} required>
                  {eventStatuses.map((status) => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field">
                <span>Source</span>
                <select name="source" defaultValue="admin" required>
                  {eventSources.map((source) => (
                    <option key={source} value={source}>
                      {source}
                    </option>
                  ))}
                </select>
              </div>

              <div className="field" style={{ gridColumn: "1 / -1" }}>
                <span>Message</span>
                <textarea
                  name="message"
                  rows={4}
                  defaultValue=""
                  placeholder="Explain the carrier scan, hold reason, or resolution details."
                  required
                />
              </div>

              <button className="button button-primary" type="submit" style={{ gridColumn: "1 / -1" }}>
                Add shipment event
              </button>
            </form>
          </section>

          <section className="panel">
            <span className="eyebrow">Shipment context</span>
            <div className="stack-grid">
            <div className="stack-row">
              <span>Order</span>
              <strong>
                {shipmentOrder ? (
                  <Link href={`/admin/orders/${shipmentOrder.id}`}>{shipmentOrder.orderNumber}</Link>
                ) : (
                  shipment.orderNumber
                )}
              </strong>
            </div>
              <div className="stack-row">
                <span>Fulfillment partner</span>
                <strong>{shipment.partnerName}</strong>
              </div>
              <div className="stack-row">
                <span>Shipped at</span>
                <strong>{shipment.shippedAt ? formatDateTime(shipment.shippedAt) : "Pending"}</strong>
              </div>
              <div className="stack-row">
                <span>Estimated delivery</span>
                <strong>{shipment.estimatedDeliveryAt ? formatDateTime(shipment.estimatedDeliveryAt) : "Pending"}</strong>
              </div>
              <div className="stack-row">
                <span>Delivered at</span>
                <strong>{shipment.deliveredAt ? formatDateTime(shipment.deliveredAt) : "Pending"}</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </div>
  );
}
