import { NextResponse } from "next/server";

import { getFormOptionalValue, getFormValue } from "@/lib/admin-form";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";
import {
  buildFulfillmentDispatchPayload,
  buildShipBobOrderPayload,
  extractDispatchCarrier,
  extractDispatchEstimatedDeliveryAt,
  extractDispatchPartnerReference,
  extractDispatchServiceLevel,
  extractDispatchTrackingNumber,
  isShipBobPartner,
  resolveFulfillmentDispatchEndpoint,
  sendFulfillmentDispatch,
} from "@/lib/fulfillment-dispatch";
import type { FulfillmentRequestStatus, ShipmentStatus } from "@/lib/types";

const dispatchableOrderStatuses = ["paid", "allocated", "partially_fulfilled"] as const;
const openRequestStatuses = ["queued", "sent", "accepted"] as const;
const terminalShipmentStatuses = ["canceled", "returned"] as const;

type JsonBody = Record<string, unknown>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function toText(value: unknown) {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return undefined;
}

function readText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = toText(record[key]);
    if (value?.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

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
      return normalized as ShipmentStatus;
    case "transit":
      return "in_transit";
    default:
      return undefined;
  }
}

function normalizeRequestStatus(value: string | undefined): FulfillmentRequestStatus {
  const normalized = value?.trim().toLowerCase().replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "queued":
      return "queued";
    case "sent":
      return "sent";
    case "accepted":
      return "accepted";
    case "rejected":
      return "rejected";
    case "fulfilled":
      return "fulfilled";
    case "failed":
      return "failed";
    case "importreview":
    case "import_review":
    case "processing":
    case "received":
    case "acknowledged":
      return "accepted";
    default:
      return "queued";
  }
}

function hasShipBobReferenceIds(order: { items: Array<{ shipbobReferenceId?: string }> }) {
  return order.items.every((item) => item.shipbobReferenceId?.trim());
}

function extractRequestStatus(
  result: Awaited<ReturnType<typeof sendFulfillmentDispatch>> | undefined,
  payload: unknown
): FulfillmentRequestStatus {
  if (!result) {
    return "queued";
  }

  if (result.error) {
    return "failed";
  }

  if (!result.endpoint) {
    return "queued";
  }

  if (!result.ok) {
    return result.status >= 400 && result.status < 500 ? "rejected" : "failed";
  }

  const record = isRecord(payload) ? payload : undefined;
  const statusText =
    (record ? readText(record, ["status", "requestStatus", "request_status", "fulfillmentStatus", "fulfillment_status"]) : undefined) ??
    (isRecord(record?.data) ? readText(record.data, ["status", "requestStatus", "request_status", "fulfillmentStatus", "fulfillment_status"]) : undefined);

  const trackingNumber = extractDispatchTrackingNumber(payload);
  if (trackingNumber) {
    return "fulfilled";
  }

  const normalizedStatus = normalizeRequestStatus(statusText);
  if (normalizedStatus !== "queued") {
    return normalizedStatus;
  }

  if (result.status === 202) {
    return "accepted";
  }

  return result.status >= 200 && result.status < 300 ? "sent" : "failed";
}

function isJsonRequest(request: Request) {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  const accept = request.headers.get("accept")?.toLowerCase() ?? "";
  return contentType.includes("application/json") || accept.includes("application/json");
}

function redirectToFulfillmentPage(request: Request, query: Record<string, string>) {
  const url = new URL("/admin/fulfillment", request.url);
  for (const [key, value] of Object.entries(query)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url, { status: 303 });
}

async function readDispatchInput(request: Request) {
  if (isJsonRequest(request)) {
    const body = (await request.json().catch(() => ({}))) as JsonBody;
    return {
      action: toText(body.action) ?? "dispatch",
      orderId: toText(body.orderId) ?? "",
      fulfillmentPartnerId: toText(body.fulfillmentPartnerId) ?? "",
      inventoryLocationId: toText(body.inventoryLocationId) ?? undefined,
    };
  }

  const formData = await request.formData();
  return {
    action: getFormValue(formData, "action", "dispatch"),
    orderId: getFormValue(formData, "orderId"),
    fulfillmentPartnerId: getFormValue(formData, "fulfillmentPartnerId"),
    inventoryLocationId: getFormOptionalValue(formData, "inventoryLocationId"),
  };
}

async function respondSuccess(
  request: Request,
  payload: Record<string, unknown>,
  result: string,
  requestId?: string,
  shipmentId?: string
) {
  if (isJsonRequest(request)) {
    return NextResponse.json(
      {
        data: payload,
        meta: {
          result,
          requestId,
          shipmentId,
        },
      },
      { status: 201 }
    );
  }

  return redirectToFulfillmentPage(request, {
    result,
    ...(requestId ? { requestId } : {}),
    ...(shipmentId ? { shipmentId } : {}),
  });
}

function respondError(request: Request, error: string, status: number) {
  if (isJsonRequest(request)) {
    return NextResponse.json({ error }, { status });
  }

  return redirectToFulfillmentPage(request, { error });
}

export async function POST(request: Request) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = getRepository();
  const { action, orderId, fulfillmentPartnerId, inventoryLocationId } = await readDispatchInput(request);

  if (action !== "dispatch") {
    return respondError(request, "invalid_action", 400);
  }

  const order = await repo.getOrderById(orderId.trim());
  if (!order) {
    return respondError(request, "invalid_order", 404);
  }

  if (!dispatchableOrderStatuses.includes(order.status as (typeof dispatchableOrderStatuses)[number])) {
    return respondError(request, order.paymentStatus === "pending" ? "payment_not_cleared" : "invalid_order", 409);
  }

  const partners = await repo.listFulfillmentPartners();
  const partner = partners.find((entry) => entry.id === fulfillmentPartnerId.trim());
  if (!partner) {
    return respondError(request, "invalid_partner", 404);
  }

  if (partner.status !== "active") {
    return respondError(request, "inactive_partner", 409);
  }

  const existingShipment = await repo.getShipmentByOrderId(order.id);
  if (
    existingShipment &&
    !terminalShipmentStatuses.includes(existingShipment.status as (typeof terminalShipmentStatuses)[number])
  ) {
    return respondError(request, "duplicate_request", 409);
  }

  const requests = await repo.listFulfillmentRequests();
  const openRequest = requests.find(
    (entry) =>
      entry.orderId === order.id &&
      openRequestStatuses.includes(entry.status as (typeof openRequestStatuses)[number])
  );
  if (openRequest) {
    return respondError(request, "duplicate_request", 409);
  }

  const inventoryLocation = inventoryLocationId
    ? (await repo.listInventoryLocations()).find((entry) => entry.id === inventoryLocationId.trim())
    : undefined;

  const shipBobPartner = isShipBobPartner(partner);
  if (shipBobPartner) {
    if (!order.shippingAddress) {
      return respondError(request, "missing_shipping_address", 422);
    }

    if (!hasShipBobReferenceIds(order)) {
      return respondError(request, "missing_shipbob_reference", 422);
    }
  }

  const requestPayload: Record<string, unknown> | undefined = shipBobPartner
    ? buildShipBobOrderPayload(order, partner, inventoryLocation)
    : buildFulfillmentDispatchPayload(order, partner, inventoryLocation);
  if (!requestPayload) {
    return respondError(request, "invalid_request_payload", 422);
  }

  const endpoint = resolveFulfillmentDispatchEndpoint(partner);

  let dispatchPayload: Record<string, unknown> | undefined;
  let responseBody: unknown;
  let responsePayload: Record<string, unknown> | undefined;
  let requestStatus = "queued";

  if (endpoint && partner.integrationType === "api") {
    const dispatchResult = await sendFulfillmentDispatch(endpoint, requestPayload);
    responseBody = dispatchResult.bodyJson ?? dispatchResult.bodyText;
    requestStatus = extractRequestStatus(dispatchResult, responseBody);
    dispatchPayload = {
      endpoint: dispatchResult.endpoint,
      ok: dispatchResult.ok,
      status: dispatchResult.status,
      durationMs: dispatchResult.durationMs,
      contentType: dispatchResult.contentType,
      body: responseBody,
      error: dispatchResult.error,
    };
    responsePayload = dispatchPayload;
  } else if (endpoint) {
    dispatchPayload = {
      endpoint: endpoint.url,
      note: "Partner integration is not API-based, so the request was queued locally.",
    };
    responsePayload = dispatchPayload;
    requestStatus = "queued";
  }

  const createdRequest = await repo.createFulfillmentRequest({
    orderId: order.id,
    orderNumber: order.orderNumber,
    fulfillmentPartnerId: partner.id,
    fulfillmentPartnerName: partner.name,
    inventoryLocationId: inventoryLocation?.id,
    inventoryLocationName: inventoryLocation?.name,
    status: normalizeRequestStatus(requestStatus),
    partnerReference: extractDispatchPartnerReference(responseBody ?? dispatchPayload ?? requestPayload),
    requestPayload,
    responsePayload,
  });

  if (requestStatus !== "failed" && requestStatus !== "rejected") {
    await repo.updateOrder(order.id, {
      fulfillmentPartnerName: partner.name,
      status: order.status === "paid" ? "allocated" : order.status,
    });
  }

  if (requestStatus === "failed" || requestStatus === "rejected") {
    return respondError(request, "dispatch_failed", 502);
  }

  const responseSource = responseBody ?? dispatchPayload;
  const readResponseText = (keys: string[]) =>
    isRecord(responseSource) ? readText(responseSource, keys) : undefined;

  const trackingNumber = extractDispatchTrackingNumber(responseBody ?? dispatchPayload);
  if (trackingNumber && !existingShipment) {
    const shipmentStatus =
      normalizeShipmentStatus(
        readResponseText(["status", "shipmentStatus", "shipment_status", "eventStatus", "event_status"])
      ) ?? (requestStatus === "fulfilled" ? "label_created" : "pending");

    const createdShipment = await repo.createShipment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      fulfillmentRequestId: createdRequest.id,
      trackingNumber,
      carrier: extractDispatchCarrier(responseBody ?? dispatchPayload, partner),
      serviceLevel: extractDispatchServiceLevel(responseBody ?? dispatchPayload),
      status: shipmentStatus,
      partnerName: partner.name,
      destination: order.destination,
      estimatedDeliveryAt: extractDispatchEstimatedDeliveryAt(responseBody ?? dispatchPayload),
      shippedAt: shipmentStatus === "shipped" || shipmentStatus === "in_transit" ? new Date().toISOString() : undefined,
    });

    const eventStatus =
      normalizeShipmentStatus(
        readResponseText(["eventStatus", "event_status", "status"])
      ) ?? shipmentStatus;

    await repo.appendShipmentEvent(createdShipment.id, {
      eventStatus,
      message:
        readResponseText(["message", "description", "detail"]) ??
        (eventStatus === "label_created"
          ? "Fulfillment partner created a shipping label."
          : eventStatus === "shipped"
            ? "Fulfillment partner marked the order as shipped."
            : "Fulfillment update received."),
      source: "3pl",
    });

    if (requestStatus === "fulfilled") {
      await repo.updateOrder(order.id, { status: "shipped" });
    }

    return respondSuccess(
      request,
      {
        request: createdRequest,
        shipmentId: createdShipment.id,
        trackingNumber,
      },
      requestStatus,
      createdRequest.id,
      createdShipment.id
    );
  }

  return respondSuccess(
    request,
    {
      request: createdRequest,
    },
    requestStatus,
    createdRequest.id
  );
}
