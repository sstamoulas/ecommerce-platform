import { NextResponse } from "next/server";

import { getFormOptionalValue, getFormValue } from "@/lib/admin-form";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";

type RouteContext = {
  params: Promise<{
    shipmentId: string;
  }>;
};

function redirectBack(request: Request, shipmentId: string) {
  return NextResponse.redirect(new URL(`/admin/shipments/${shipmentId}`, request.url), { status: 303 });
}

function normalizeShipmentSource(value: string) {
  switch (value.trim().toLowerCase()) {
    case "3pl":
    case "carrier":
    case "admin":
    case "customer_service":
    case "system":
      return value.trim().toLowerCase() as "3pl" | "carrier" | "admin" | "customer_service" | "system";
    default:
      return "admin";
  }
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { shipmentId } = await params;
  const repo = getRepository();
  const shipment = await repo.getShipmentById(shipmentId);

  if (!shipment) {
    return NextResponse.json({ error: "Shipment not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const action = getFormValue(formData, "action", "append_event");

  const eventPayload = {
    eventStatus: getFormValue(formData, "eventStatus", "tracking_update"),
    message: getFormOptionalValue(formData, "message") ?? "Shipment update recorded.",
    source: normalizeShipmentSource(getFormValue(formData, "source", "admin")),
    eventAt: getFormOptionalValue(formData, "eventAt"),
  };

  if (action === "mark_exception") {
    await repo.appendShipmentEvent(shipmentId, {
      ...eventPayload,
      eventStatus: "exception",
      message: getFormOptionalValue(formData, "message") ?? "Shipment flagged for review.",
      source: "admin",
    });
    return redirectBack(request, shipmentId);
  }

  if (action === "resolve_exception") {
    await repo.appendShipmentEvent(shipmentId, {
      ...eventPayload,
      eventStatus: "in_transit",
      message: getFormOptionalValue(formData, "message") ?? "Exception resolved and shipment resumed.",
      source: "admin",
    });
    return redirectBack(request, shipmentId);
  }

  if (action === "mark_shipped") {
    await repo.appendShipmentEvent(shipmentId, {
      ...eventPayload,
      eventStatus: "shipped",
      message: getFormOptionalValue(formData, "message") ?? "Shipment handed to the carrier.",
      source: "admin",
    });
    return redirectBack(request, shipmentId);
  }

  if (action === "mark_out_for_delivery") {
    await repo.appendShipmentEvent(shipmentId, {
      ...eventPayload,
      eventStatus: "out_for_delivery",
      message: getFormOptionalValue(formData, "message") ?? "Shipment is out for delivery.",
      source: "admin",
    });
    return redirectBack(request, shipmentId);
  }

  if (action === "mark_delivered") {
    await repo.appendShipmentEvent(shipmentId, {
      ...eventPayload,
      eventStatus: "delivered",
      message: getFormOptionalValue(formData, "message") ?? "Shipment delivered successfully.",
      source: "admin",
    });
    return redirectBack(request, shipmentId);
  }

  if (action === "mark_returned") {
    await repo.appendShipmentEvent(shipmentId, {
      ...eventPayload,
      eventStatus: "returned",
      message: getFormOptionalValue(formData, "message") ?? "Shipment returned to sender.",
      source: "admin",
    });
    return redirectBack(request, shipmentId);
  }

  await repo.appendShipmentEvent(shipmentId, eventPayload);
  return redirectBack(request, shipmentId);
}
