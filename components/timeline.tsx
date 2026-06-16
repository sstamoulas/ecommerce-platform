import type { Shipment } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

import { StatusPill } from "@/components/status-pill";

type TimelineProps = {
  shipment: Shipment;
};

export function Timeline({ shipment }: TimelineProps) {
  return (
    <section className="panel">
      <div className="panel__heading">
        <div>
          <span className="eyebrow">Shipment timeline</span>
          <h2>Live events from the 3PL and carrier</h2>
        </div>
        <StatusPill status={shipment.status} />
      </div>
      <div className="timeline">
        {shipment.events.map((event) => (
          <article className="timeline__item" key={event.id}>
            <div className="timeline__rail">
              <span className="timeline__dot" />
            </div>
            <div className="timeline__content">
              <div className="timeline__topline">
                <StatusPill status={event.eventStatus} />
                <span>{formatDateTime(event.eventAt)}</span>
              </div>
              <p>{event.message}</p>
              <span className="timeline__source">{event.source}</span>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
