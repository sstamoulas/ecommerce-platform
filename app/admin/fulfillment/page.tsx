import Link from "next/link";

import { MetricCard } from "@/components/metric-card";
import { StatusPill } from "@/components/status-pill";
import { requireAdminPage } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";
import { formatCurrency, formatDateTime } from "@/lib/utils";

type FulfillmentPageProps = {
  searchParams: Promise<{
    result?: string;
    error?: string;
    orderId?: string;
  }>;
};

const dispatchableOrderStatuses = ["paid", "allocated", "partially_fulfilled"] as const;
const activeRequestStatuses = ["queued", "sent", "accepted"] as const;

function messageForResult(value: string | undefined) {
  switch (value) {
    case "queued":
      return "Fulfillment request queued locally. Configure an endpoint to send it automatically.";
    case "sent":
      return "Fulfillment request sent to the configured partner endpoint.";
    case "accepted":
      return "Partner accepted the dispatch request.";
    case "fulfilled":
      return "Fulfillment response included tracking or shipment details.";
    default:
      return undefined;
  }
}

function messageForError(value: string | undefined) {
  switch (value) {
    case "duplicate_request":
      return "That order already has an open fulfillment request or shipment.";
    case "invalid_order":
      return "The selected order is not eligible for fulfillment dispatch.";
    case "invalid_partner":
      return "The selected fulfillment partner is not available for dispatch.";
    case "inactive_partner":
      return "That partner is paused or disabled and cannot receive new dispatches.";
    case "payment_not_cleared":
      return "The order still needs a payable status before dispatch.";
    case "dispatch_failed":
      return "The outbound dispatch failed. Review the response payload in the request history.";
    default:
      return undefined;
  }
}

export default async function FulfillmentPage({ searchParams }: FulfillmentPageProps) {
  await requireAdminPage("/admin/fulfillment");

  const { result, error } = await searchParams;
  const repo = getRepository();
  const [orders, shipments, fulfillmentPartners, fulfillmentRequests, inventoryLocations] = await Promise.all([
    repo.listOrders(),
    repo.listShipments(),
    repo.listFulfillmentPartners(),
    repo.listFulfillmentRequests(),
    repo.listInventoryLocations(),
  ]);

  const openRequests = fulfillmentRequests.filter((request) =>
    activeRequestStatuses.includes(request.status as (typeof activeRequestStatuses)[number])
  );
  const shipmentsByOrderId = new Map(shipments.map((shipment) => [shipment.orderId, shipment]));
  const openRequestByOrderId = new Map(openRequests.map((request) => [request.orderId, request]));
  const dispatchableOrders = orders.filter(
    (order) =>
      dispatchableOrderStatuses.includes(order.status as (typeof dispatchableOrderStatuses)[number]) &&
      !shipmentsByOrderId.get(order.id) &&
      !openRequestByOrderId.get(order.id)
  );
  const activePartners = fulfillmentPartners.filter((partner) => partner.status === "active");

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Fulfillment dispatch</span>
        <h1>Send paid orders to a 3PL and keep the request history tied to each shipment.</h1>
        <p>
          This queue is the handoff point between the storefront and the logistics partner. Orders
          can be staged, dispatched, and tracked without leaving the admin console.
        </p>
        {(messageForResult(result) || messageForError(error)) ? (
          <p className="deal-note">{messageForResult(result) ?? messageForError(error)}</p>
        ) : null}
      </section>

      <div className="metric-grid">
        <MetricCard
          title="Dispatch-ready orders"
          value={dispatchableOrders.length.toString()}
          caption="Paid orders without an active request or shipment"
        />
        <MetricCard
          title="Open requests"
          value={openRequests.length.toString()}
          caption="Queued, sent, or accepted fulfillment requests"
        />
        <MetricCard
          title="Active partners"
          value={activePartners.length.toString()}
          caption="3PLs currently available for dispatch"
        />
      </div>

      <div className="admin-grid">
        <section className="panel">
          <div className="panel__heading">
            <div>
              <span className="eyebrow">Dispatch queue</span>
              <h2>Orders waiting to be handed to a 3PL</h2>
            </div>
          </div>

          <div className="stack-grid">
            {orders.filter((order) => dispatchableOrderStatuses.includes(order.status as (typeof dispatchableOrderStatuses)[number]) || openRequestByOrderId.has(order.id) || shipmentsByOrderId.has(order.id)).map((order) => {
              const shipment = shipmentsByOrderId.get(order.id);
              const openRequest = openRequestByOrderId.get(order.id);
              const requestHistory = fulfillmentRequests.find((entry) => entry.orderId === order.id);
              const defaultPartnerId =
                activePartners.find((partner) => partner.name === order.fulfillmentPartnerName)?.id ??
                activePartners[0]?.id ??
                "";

              return (
                <article className="queue-card" key={order.id} style={{ padding: "18px 18px 16px" }}>
                  <div className="queue-card__topline">
                    <StatusPill status={order.status} />
                    <StatusPill status={order.paymentStatus} />
                  </div>
                  <strong>
                    <Link href={`/admin/orders/${order.id}`}>{order.orderNumber}</Link>
                  </strong>
                  <p>
                    {order.customerName} to {order.destination}. {order.itemCount} item{order.itemCount === 1 ? "" : "s"} total {formatCurrency(order.total)}.
                  </p>
                  <div className="stack-row">
                    <span>Routing partner</span>
                    <strong>{order.fulfillmentPartnerName}</strong>
                  </div>
                  {shipment ? (
                    <div className="stack-row">
                      <span>Shipment</span>
                      <strong>
                        <Link href={`/admin/shipments/${shipment.id}`}>{shipment.trackingNumber}</Link>
                      </strong>
                    </div>
                  ) : null}
                  {requestHistory ? (
                    <div className="stack-row">
                      <span>Request</span>
                      <strong>
                        <StatusPill
                          status={requestHistory.status}
                          label={requestHistory.partnerReference ?? requestHistory.orderNumber}
                        />
                      </strong>
                    </div>
                  ) : null}
                  {!shipment && !openRequest ? (
                    <form
                      className="form-grid"
                      action="/api/v1/admin/fulfillment/dispatch"
                      method="post"
                      style={{ marginTop: "0.75rem" }}
                    >
                      <input type="hidden" name="action" value="dispatch" />
                      <input type="hidden" name="orderId" value={order.id} />

                      <div className="field">
                        <span>Fulfillment partner</span>
                        <select name="fulfillmentPartnerId" defaultValue={defaultPartnerId} required>
                          {activePartners.map((partner) => (
                            <option key={partner.id} value={partner.id}>
                              {partner.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="field">
                        <span>Inventory location</span>
                        <select name="inventoryLocationId" defaultValue="">
                          <option value="">Auto-select location</option>
                          {inventoryLocations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <button className="button button-primary" type="submit">
                        Dispatch to 3PL
                      </button>
                    </form>
                  ) : null}
                </article>
              );
            })}
          </div>
        </section>

        <aside className="stack-grid">
          <section className="panel">
            <span className="eyebrow">Partner routing</span>
            <h2>Configured 3PLs</h2>
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
          </section>

          <section className="panel">
            <span className="eyebrow">Request history</span>
            <h2>Recent fulfillment requests</h2>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order</th>
                    <th>Partner</th>
                    <th>Status</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {fulfillmentRequests.map((request) => (
                    <tr key={request.id}>
                      <td>
                        <strong>{request.orderNumber}</strong>
                        <div className="deal-note" style={{ marginTop: "0.25rem" }}>
                          {request.inventoryLocationName ?? "No location"} {request.partnerReference ? `• ${request.partnerReference}` : ""}
                        </div>
                      </td>
                      <td>{request.fulfillmentPartnerName}</td>
                      <td>
                        <StatusPill status={request.status} />
                      </td>
                      <td>{formatDateTime(request.createdAt)}</td>
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
