import Link from "next/link";

import { Timeline } from "@/components/timeline";
import { StatusPill } from "@/components/status-pill";
import { requireAdminPage } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export default async function AdminShipmentsPage() {
  await requireAdminPage("/admin/shipments");

  const repo = getRepository();
  const shipments = await repo.listShipments();
  const latestShipment = shipments[0];

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Shipments</span>
        <h1>Track carrier status, exceptions, and delivery timing.</h1>
        <p>
          This view is for operations first: if the carrier or 3PL stops updating, the issue should
          be obvious before the customer calls.
        </p>
      </section>

      <div className="admin-grid">
        <section className="panel">
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Tracking</th>
                  <th>Order</th>
                  <th>Carrier</th>
                  <th>Status</th>
                  <th>Destination</th>
                  <th>Updated</th>
                </tr>
              </thead>
              <tbody>
                {shipments.map((shipment) => {
                  const latestEvent = shipment.events[shipment.events.length - 1];

                  return (
                    <tr key={shipment.id}>
                      <td>
                        <strong>
                          <Link href={`/admin/shipments/${shipment.id}`}>{shipment.trackingNumber}</Link>
                        </strong>
                      </td>
                      <td>{shipment.orderNumber}</td>
                      <td>
                        {shipment.carrier} {shipment.serviceLevel}
                      </td>
                      <td>
                        <StatusPill status={shipment.status} />
                      </td>
                      <td>{shipment.destination}</td>
                      <td>{latestEvent ? formatDateTime(latestEvent.eventAt) : "Pending"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="stack-grid">
          <article className="panel">
            <span className="eyebrow">Latest shipment</span>
            <h2>{latestShipment.trackingNumber}</h2>
            <div className="stack-row">
              <span>Status</span>
              <strong>{latestShipment.status}</strong>
            </div>
            <div className="stack-row">
              <span>Partner</span>
              <strong>{latestShipment.partnerName}</strong>
            </div>
            <div className="stack-row">
              <span>ETA</span>
              <strong>{latestShipment.estimatedDeliveryAt ? formatDateTime(latestShipment.estimatedDeliveryAt) : "Pending"}</strong>
            </div>
          </article>
          <Timeline shipment={latestShipment} />
        </aside>
      </div>
    </div>
  );
}
