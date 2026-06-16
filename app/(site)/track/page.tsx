import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { getRepository } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

export default async function TrackHubPage() {
  const repo = getRepository();
  const recentShipments = (await repo.listShipments()).slice(0, 3);

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Shipment tracking</span>
        <h1>Give customers a single place to check order progress after it leaves the dock.</h1>
        <p>
          Tracking starts with the label, then progresses through carrier scans and final delivery.
          Exceptions stay visible so support can respond quickly.
        </p>
      </section>

      <div className="track-layout">
        <section className="track-layout__main">
          <div className="section-heading">
            <div>
              <span className="eyebrow">Recent shipments</span>
              <h2>Sample tracking numbers in the system</h2>
            </div>
            <Link href="/store">Open catalog</Link>
          </div>

          <div className="promo-stack">
            {recentShipments.map((shipment) => (
              <article className="promo-card" key={shipment.id}>
                <div className="promo-card__topline">
                  <StatusPill status={shipment.status} />
                  <span>{shipment.trackingNumber}</span>
                </div>
                <strong>{shipment.orderNumber}</strong>
                <p>
                  {shipment.carrier} {shipment.serviceLevel} to {shipment.destination}
                </p>
                <div className="promo-card__footer">
                  <span>{formatDateTime(shipment.events[0].eventAt)}</span>
                  <Link href={`/track/${shipment.trackingNumber}`}>View timeline</Link>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="panel">
          <span className="eyebrow">How it works</span>
          <h2>Tracking number entry pattern</h2>
          <div className="stack-grid">
            <div className="stack-row">
              <span>Example</span>
              <strong>TXT-1048</strong>
            </div>
            <div className="stack-row">
              <span>Where customers find it</span>
              <strong>Order confirmation email and account page</strong>
            </div>
            <div className="stack-row">
              <span>Supported statuses</span>
              <strong>Label created, in transit, delivered, exception</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
