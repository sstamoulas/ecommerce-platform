import { NextResponse } from "next/server";

import { getRepository } from "@/lib/data";
import type { ShipmentEventSource } from "@/lib/types";

function normalizeShipmentStatus(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "pending":
    case "label_created":
    case "packed":
    case "shipped":
    case "in_transit":
    case "out_for_delivery":
    case "delivered":
    case "canceled":
    case "exception":
    case "returned":
      return normalized;
    case "transit":
      return "in_transit";
    default:
      return normalized;
  }
}

function normalizeShipmentSource(value: string | undefined): ShipmentEventSource {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case "3pl":
    case "carrier":
    case "admin":
    case "customer_service":
    case "system":
      return normalized;
    default:
      return "system";
  }
}

type RouteContext = {
  params: Promise<{
    shipmentId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  const repo = getRepository();
  const { shipmentId } = await params;
  const shipment =
    (await repo.getShipmentById(shipmentId)) ?? (await repo.getShipmentByTrackingNumber(shipmentId));

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  const payload = await request.json().catch(() => ({}));
  const event = await repo.appendShipmentEvent(shipment.id, {
    eventStatus: normalizeShipmentStatus(payload.eventStatus ?? payload.status) ?? "system_update",
    message: payload.message ?? "Tracking event received.",
    source: normalizeShipmentSource(payload.source),
    eventAt: payload.eventAt,
  });

  return NextResponse.json(
    {
      data: event
        ? {
            shipmentId: shipment.id,
            eventStatus: event.eventStatus,
            message: event.message,
            receivedAt: event.eventAt,
            persisted: true,
          }
        : {
            shipmentId: shipment.id,
            eventStatus: payload.eventStatus ?? "system_update",
            message: payload.message ?? "Tracking event received.",
            receivedAt: new Date().toISOString(),
            persisted: false,
          },
    },
    { status: 201 }
  );
}
