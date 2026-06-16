import Link from "next/link";

import { StatusPill } from "@/components/status-pill";
import { Timeline } from "@/components/timeline";
import { getRepository } from "@/lib/data";
import { formatDateTime } from "@/lib/utils";

type ShipmentPageProps = {
  params: Promise<{
    trackingNumber: string;
  }>;
};

export default async function ShipmentPage({ params }: ShipmentPageProps) {
  const repo = getRepository();
  const { trackingNumber } = await params;
  const shipment = await repo.getShipmentByTrackingNumber(trackingNumber);

  if (!shipment) {
    return (
      <div className="page-shell">
        <section className="panel empty-state">
          <span className="eyebrow">Tracking not found</span>
          <h1>We could not find that tracking number.</h1>
          <p>Check the number from the order email, or open the tracking hub for sample shipments.</p>
          <Link className="button button-primary" href="/track">
            Open tracking hub
          </Link>
        </section>
      </div>
    );
  }

  return (
    <div className="page-shell">
      <section className="page-hero">
        <span className="eyebrow">Tracking details</span>
        <h1>{shipment.trackingNumber}</h1>
        <p>
          Order {shipment.orderNumber} to {shipment.destination}. Carrier updates are pulled from
          the 3PL or carrier feed as they arrive.
        </p>
        <div className="hero__actions">
          <StatusPill status={shipment.status} />
          <span className="chip">{shipment.carrier} {shipment.serviceLevel}</span>
        </div>
      </section>

      <div className="track-layout">
        <div className="track-layout__main">
          <Timeline shipment={shipment} />
        </div>

        <aside className="panel">
          <span className="eyebrow">Shipment details</span>
          <h2>Partner and order context</h2>
          <div className="stack-grid">
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
              <strong>
                {shipment.estimatedDeliveryAt ? formatDateTime(shipment.estimatedDeliveryAt) : "Pending"}
              </strong>
            </div>
            <div className="stack-row">
              <span>Delivery status</span>
              <strong>{shipment.deliveredAt ? formatDateTime(shipment.deliveredAt) : "Not delivered yet"}</strong>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
