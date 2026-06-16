import { createHmac, timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { getRepository } from "@/lib/data";
import type { ShipmentEventSource, ShipmentStatus } from "@/lib/types";

type RouteContext = {
  params: Promise<{
    partnerKey: string;
  }>;
};

type WebhookEventRecord = Record<string, unknown>;

type NormalizedWebhookEvent = {
  shipmentId?: string;
  trackingNumber?: string;
  orderNumber?: string;
  eventStatus: string;
  message: string;
  source: ShipmentEventSource;
  eventAt?: string;
};

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

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function normalizeShipmentStatus(value: string | undefined): ShipmentStatus | undefined {
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
      return undefined;
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
      return "3pl";
  }
}

function normalizeTimestamp(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

function readHeaderValue(headers: Headers, names: string[]) {
  for (const name of names) {
    const value = headers.get(name);
    if (value?.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function isShipBobPartner(partnerKey: string, partner: { id: string; name: string }) {
  const normalizedKey = slugify(partnerKey);
  return normalizedKey === "shipbob" || slugify(partner.id) === "shipbob" || slugify(partner.name) === "shipbob";
}

function normalizeShipBobTopic(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase().replace(/[\s-]+/g, "_");

  switch (normalized) {
    case "order_shipped":
    case "order.shipped":
      return "shipped";
    case "order_shipment_tracking_updated":
    case "order.shipment.tracking.updated":
    case "shipment_tracking_updated":
    case "shipment.tracking.updated":
      return "in_transit";
    case "order_shipment_delivered":
    case "order.shipment.delivered":
    case "shipment_delivered":
    case "shipment.delivered":
      return "delivered";
    case "order_shipment_exception":
    case "order.shipment.exception":
    case "shipment_exception":
    case "shipment.exception":
    case "order_shipment_on_hold":
    case "order.shipment.on_hold":
    case "shipment_onhold":
    case "shipment.on_hold":
      return "exception";
    case "order_shipment_cancelled":
    case "order.shipment.cancelled":
    case "shipment_cancelled":
    case "shipment.cancelled":
      return "canceled";
    case "return_completed":
    case "return.completed":
    case "return_completed_event":
      return "returned";
    case "order_shipment_shipping_service_updated":
    case "order.shipment.shipping_service.updated":
    case "shipment_shipping_service_updated":
    case "shipment.shipping_service.updated":
      return "label_created";
    default:
      return undefined;
  }
}

function getShipBobWebhookSecret() {
  const secret = process.env.SHIPBOB_WEBHOOK_SECRET?.trim();
  if (!secret) {
    return undefined;
  }

  return secret;
}

function signatureMatches(expectedSignature: string, providedSignature: string) {
  const expectedBuffer = Buffer.from(expectedSignature);
  const providedBuffer = Buffer.from(providedSignature);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function verifyShipBobWebhookSignature(request: Request, rawBody: string) {
  const secret = getShipBobWebhookSecret();
  if (!secret) {
    return false;
  }

  const webhookId = readHeaderValue(request.headers, ["webhook-id"]);
  const webhookTimestamp = readHeaderValue(request.headers, ["webhook-timestamp"]);
  const webhookSignature = readHeaderValue(request.headers, ["webhook-signature"]);

  if (!webhookId || !webhookTimestamp || !webhookSignature) {
    return false;
  }

  const secretParts = secret.startsWith("whsec_") ? secret.split("_").slice(1).join("_") : secret;
  const decodedSecret = Buffer.from(secretParts, "base64");
  const signedContent = `${webhookId}.${webhookTimestamp}.${rawBody}`;
  const expectedSignature = createHmac("sha256", decodedSecret).update(signedContent).digest("base64");

  return webhookSignature
    .split(" ")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .some((entry) => {
      const candidate = entry.includes(",") ? entry.split(",").slice(1).join(",") : entry;
      return signatureMatches(expectedSignature, candidate);
    });
}

function collectShipBobShipmentPayloads(payload: unknown): Record<string, unknown>[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const shipmentCollections = ["shipments", "shipment", "data", "events"] as const;
  for (const key of shipmentCollections) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  if (isRecord(payload.shipment)) {
    return [payload.shipment];
  }

  if (isRecord(payload.data)) {
    if (Array.isArray(payload.data.shipments)) {
      return payload.data.shipments.filter(isRecord);
    }

    if (isRecord(payload.data.shipment)) {
      return [payload.data.shipment];
    }

    return [payload.data];
  }

  return [payload];
}

function collectShipBobEvents(payload: unknown, topic: string | undefined): NormalizedWebhookEvent[] {
  const shipmentPayloads = collectShipBobShipmentPayloads(payload);
  const topicStatus = normalizeShipBobTopic(topic);

  return shipmentPayloads
    .map((entry) => {
      const tracking = isRecord(entry.tracking) ? entry.tracking : undefined;
      const shipmentId = readText(entry, ["shipmentId", "shipment_id", "id"]);
      const trackingNumber =
        readText(entry, ["trackingNumber", "tracking_number", "tracking"]) ??
        readText(tracking ?? {}, [
          "trackingNumber",
          "tracking_number",
          "number",
        ]);
      const orderNumber =
        readText(entry, ["orderNumber", "order_number", "reference_id", "referenceId"]) ??
        readText(entry, ["order", "order_id"]);
      const statusFromPayload = readText(
        entry,
        ["eventStatus", "event_status", "status", "trackingStatus", "tracking_status"]
      );
      const message =
        readText(entry, ["message", "description", "detail", "eventMessage", "trackingMessage"]) ??
        (topic ? `ShipBob webhook received for ${topic}.` : "ShipBob webhook received.");
      const eventAt = normalizeTimestamp(
        readText(entry, ["eventAt", "event_at", "timestamp", "occurredAt", "occurred_at", "createdAt", "created_at"])
      );

      const shipment = isRecord(entry.shipment) ? entry.shipment : undefined;
      const nestedTracking = isRecord(shipment?.tracking) ? shipment.tracking : undefined;
      const nestedTrackingNumber =
        readText(shipment ?? {}, ["trackingNumber", "tracking_number"]) ??
        readText(nestedTracking ?? {}, ["trackingNumber", "tracking_number", "number"]);

      return {
        shipmentId,
        trackingNumber: trackingNumber ?? nestedTrackingNumber,
        orderNumber,
        eventStatus: topicStatus ?? normalizeShipmentStatus(statusFromPayload ?? "tracking_update") ?? "tracking_update",
        message,
        source: "3pl" as ShipmentEventSource,
        eventAt,
      };
    })
    .filter((event) => event.shipmentId || event.trackingNumber || event.orderNumber);
}

function readWebhookSecret(request: Request) {
  return request.headers.get("x-fulfillment-secret") ?? request.headers.get("x-webhook-secret");
}

function hasValidWebhookSecret(request: Request) {
  const expected = process.env.FULFILLMENT_WEBHOOK_SECRET?.trim();
  if (!expected) {
    return true;
  }

  const provided = readWebhookSecret(request)?.trim();
  if (!provided) {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);

  if (expectedBuffer.length !== providedBuffer.length) {
    return false;
  }

  return timingSafeEqual(expectedBuffer, providedBuffer);
}

function partnerKeyCandidates(partner: { id: string; name: string }) {
  const id = partner.id.trim().toLowerCase();
  const name = partner.name.trim().toLowerCase();
  const idWithoutPrefix = id.replace(/^partner[_-]?/, "");

  return new Set([
    id,
    slugify(partner.id),
    idWithoutPrefix,
    slugify(idWithoutPrefix),
    name,
    slugify(partner.name),
  ]);
}

function resolvePartnerByKey(partners: { id: string; name: string }[], partnerKey: string) {
  const normalizedKey = partnerKey.trim().toLowerCase();
  const slugKey = slugify(partnerKey);

  return partners.find((partner) => {
    const candidates = partnerKeyCandidates(partner);
    return candidates.has(normalizedKey) || candidates.has(slugKey);
  });
}

function collectWebhookEvents(payload: unknown): WebhookEventRecord[] {
  if (Array.isArray(payload)) {
    return payload.filter(isRecord);
  }

  if (!isRecord(payload)) {
    return [];
  }

  const possibleCollections = ["events", "updates", "items", "records"] as const;
  for (const key of possibleCollections) {
    const value = payload[key];
    if (Array.isArray(value)) {
      return value.filter(isRecord);
    }
  }

  if (Array.isArray(payload.data)) {
    return payload.data.filter(isRecord);
  }

  if (isRecord(payload.data)) {
    for (const key of possibleCollections) {
      const value = payload.data[key];
      if (Array.isArray(value)) {
        return value.filter(isRecord);
      }
    }

    return [payload.data];
  }

  if (isRecord(payload.event)) {
    return [payload.event];
  }

  return [payload];
}

function normalizeWebhookEvent(payload: WebhookEventRecord): NormalizedWebhookEvent | undefined {
  const shipmentId = readText(payload, ["shipmentId", "shipment_id"]);
  const trackingNumber = readText(payload, ["trackingNumber", "tracking_number", "tracking"]);
  const orderNumber = readText(payload, ["orderNumber", "order_number", "order"]);
  const rawStatus =
    readText(payload, ["eventStatus", "event_status", "status", "trackingStatus", "tracking_status"]) ??
    "tracking_update";

  const message =
    readText(payload, ["message", "description", "detail", "eventMessage", "trackingMessage"]) ??
    "Tracking event received.";
  const source = normalizeShipmentSource(
    readText(payload, ["source", "eventSource", "event_source", "origin"])
  );
  const eventAt = normalizeTimestamp(
    readText(payload, ["eventAt", "event_at", "timestamp", "occurredAt", "occurred_at", "createdAt", "created_at"])
  );

  if (!shipmentId && !trackingNumber && !orderNumber) {
    return undefined;
  }

  return {
    shipmentId,
    trackingNumber,
    orderNumber,
    eventStatus: normalizeShipmentStatus(rawStatus) ?? "tracking_update",
    message,
    source,
    eventAt,
  };
}

async function createShipmentFromEvent(
  repo: ReturnType<typeof getRepository>,
  partner: { id: string; name: string },
  event: NormalizedWebhookEvent
) {
  if (!event.orderNumber || !event.trackingNumber) {
    return undefined;
  }

  const [orders, fulfillmentRequests] = await Promise.all([repo.listOrders(), repo.listFulfillmentRequests()]);
  const order = orders.find((entry) => entry.orderNumber.trim().toLowerCase() === event.orderNumber?.trim().toLowerCase());
  if (!order) {
    return undefined;
  }

  const linkedRequest = fulfillmentRequests.find((entry) => entry.orderId === order.id);

  return repo.createShipment({
    orderId: order.id,
    orderNumber: order.orderNumber,
    fulfillmentRequestId: linkedRequest?.id,
    trackingNumber: event.trackingNumber,
    carrier: partner.name,
    serviceLevel: "Standard",
    status: normalizeShipmentStatus(event.eventStatus) ?? "pending",
    partnerName: partner.name,
    destination: order.destination,
    shippedAt:
      ["shipped", "in_transit", "out_for_delivery", "delivered"].includes(event.eventStatus)
        ? event.eventAt
        : undefined,
    estimatedDeliveryAt: undefined,
    deliveredAt: event.eventStatus === "delivered" ? event.eventAt : undefined,
  });
}

async function resolveShipmentForEvent(
  repo: ReturnType<typeof getRepository>,
  partner: { id: string; name: string },
  event: NormalizedWebhookEvent
) {
  if (event.shipmentId) {
    const shipment = await repo.getShipmentById(event.shipmentId);
    if (shipment) {
      return shipment;
    }
  }

  if (event.trackingNumber) {
    const shipment = await repo.getShipmentByTrackingNumber(event.trackingNumber);
    if (shipment) {
      return shipment;
    }
  }

  if (event.orderNumber) {
    const shipments = await repo.listShipments();
    const lookup = event.orderNumber.trim().toLowerCase();
    const shipment = shipments.find((shipment) => shipment.orderNumber.trim().toLowerCase() === lookup);
    if (shipment && !["canceled", "returned"].includes(shipment.status)) {
      return shipment;
    }
  }

  return createShipmentFromEvent(repo, partner, event);
}

export async function POST(request: Request, { params }: RouteContext) {
  const { partnerKey } = await params;
  const repo = getRepository();
  const partners = await repo.listFulfillmentPartners();
  const partner = resolvePartnerByKey(partners, partnerKey);
  const isShipBob = partner ? isShipBobPartner(partnerKey, partner) : slugify(partnerKey) === "shipbob";

  if (!partner) {
    return NextResponse.json({ error: "Fulfillment partner not found" }, { status: 404 });
  }

  const rawBody = await request.text().catch(() => "");
  if (!rawBody.trim()) {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  if (isShipBob) {
    if (!getShipBobWebhookSecret()) {
      return NextResponse.json({ error: "ShipBob webhook secret not configured" }, { status: 500 });
    }

    if (!verifyShipBobWebhookSignature(request, rawBody)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  } else if (!hasValidWebhookSecret(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const topic = readHeaderValue(request.headers, ["x-webhook-topic", "shipbob-topic"]);
  const rawEvents = isShipBob ? collectShipBobEvents(payload, topic) : collectWebhookEvents(payload).map((entry) => normalizeWebhookEvent(entry)).filter((entry): entry is NormalizedWebhookEvent => entry !== undefined);
  const accepted: Array<{
    shipmentId: string;
    orderNumber: string;
    trackingNumber: string;
    eventStatus: string;
    eventAt: string;
  }> = [];
  const skipped: Array<{
    index: number;
    reason: string;
    shipmentId?: string;
    trackingNumber?: string;
    orderNumber?: string;
  }> = [];

  for (const [index, event] of rawEvents.entries()) {
    if (!event.eventStatus) {
      skipped.push({
        index,
        reason: "missing_event_status",
      });
      continue;
    }

    const shipment = await resolveShipmentForEvent(repo, partner, event);
    if (!shipment) {
      skipped.push({
        index,
        reason: "shipment_not_found",
        shipmentId: event.shipmentId,
        trackingNumber: event.trackingNumber,
        orderNumber: event.orderNumber,
      });
      continue;
    }

    const persisted = await repo.appendShipmentEvent(shipment.id, {
      eventStatus: event.eventStatus,
      message: event.message,
      source: event.source,
      eventAt: event.eventAt,
    });

    if (!persisted) {
      skipped.push({
        index,
        reason: "append_failed",
        shipmentId: shipment.id,
        trackingNumber: shipment.trackingNumber,
        orderNumber: shipment.orderNumber,
      });
      continue;
    }

    accepted.push({
      shipmentId: shipment.id,
      orderNumber: shipment.orderNumber,
      trackingNumber: shipment.trackingNumber,
      eventStatus: persisted.eventStatus,
      eventAt: persisted.eventAt,
    });
  }

  return NextResponse.json(
    {
      data: {
        partnerKey,
        partnerId: partner.id,
        partnerName: partner.name,
        acceptedEvents: accepted.length,
        skippedEvents: skipped.length,
        accepted,
        skipped,
      },
      meta: {
        received: rawEvents.length,
      },
    },
    { status: 202 }
  );
}
