import type { FulfillmentPartner, InventoryLocation, Order } from "@/lib/types";

type DispatchEndpointConfig = string | {
  url: string;
  headers?: Record<string, string>;
  timeoutMs?: number;
};

export type ResolvedDispatchEndpoint = {
  url: string;
  headers: Record<string, string>;
  timeoutMs: number;
};

export type FulfillmentDispatchResult = {
  endpoint: string;
  ok: boolean;
  status: number;
  durationMs: number;
  bodyText: string;
  bodyJson?: unknown;
  contentType?: string;
  error?: string;
};

type ShipBobRecipientAddress = {
  address1: string;
  address2?: string;
  company_name: string | null;
  city: string;
  state: string;
  country: string;
  zip_code: string;
};

type ShipBobOrderPayload = {
  shipping_method: string;
  recipient: {
    name: string;
    address: ShipBobRecipientAddress;
    email?: string;
    phone_number?: string;
  };
  products: Array<{
    name: string;
    reference_id: string;
    quantity: number;
    unit_price: number;
  }>;
  reference_id: string;
  order_number: string;
  type: "DTC";
  financials: {
    total_price: number;
  };
  purchase_date: string;
  tags?: Array<{
    name: string;
    value: string;
  }>;
};

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[_\s]+/g, "-")
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function getDefaultTimeoutMs() {
  const configured = Number(process.env.FULFILLMENT_DISPATCH_TIMEOUT_MS ?? "");
  return Number.isFinite(configured) && configured > 0 ? configured : 10_000;
}

function readDispatchEndpointConfig() {
  const raw = process.env.FULFILLMENT_DISPATCH_ENDPOINTS_JSON?.trim();
  if (!raw) {
    return {};
  }

  try {
    return JSON.parse(raw) as Record<string, DispatchEndpointConfig>;
  } catch {
    return {};
  }
}

function normalizeHeaderMap(headers?: Record<string, string>) {
  return Object.entries(headers ?? {}).reduce<Record<string, string>>((accumulator, [key, value]) => {
    if (typeof value === "string" && value.trim()) {
      accumulator[key] = value.trim();
    }

    return accumulator;
  }, {});
}

function endpointCandidates(partner: FulfillmentPartner) {
  const id = partner.id.trim().toLowerCase();
  const idWithoutPrefix = id.replace(/^partner[_-]?/, "");
  const name = partner.name.trim().toLowerCase();

  return [
    id,
    slugify(partner.id),
    idWithoutPrefix,
    slugify(idWithoutPrefix),
    name,
    slugify(partner.name),
    "default",
  ];
}

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

function deepReadText(value: unknown, keys: string[], visited = new Set<object>()): string | undefined {
  if (Array.isArray(value)) {
    for (const entry of value) {
      const result = deepReadText(entry, keys, visited);
      if (result) {
        return result;
      }
    }

    return undefined;
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const direct = readText(value, keys);
  if (direct) {
    return direct;
  }

  if (visited.has(value)) {
    return undefined;
  }

  visited.add(value);

  for (const entry of Object.values(value)) {
    const result = deepReadText(entry, keys, visited);
    if (result) {
      return result;
    }
  }

  return undefined;
}

function normalizeShippingAddress(address: Order["shippingAddress"]) {
  if (!address) {
    return undefined;
  }

  const address1 = address.address1.trim();
  const city = address.city.trim();
  const state = address.state.trim();
  const country = address.country.trim();
  const zipCode = address.zipCode.trim();

  if (!address1 || !city || !state || !country || !zipCode) {
    return undefined;
  }

  return {
    address1,
    address2: address.address2?.trim() || undefined,
    companyName: address.companyName?.trim() || undefined,
    city,
    state,
    country,
    zipCode,
    email: address.email?.trim() || undefined,
    phoneNumber: address.phoneNumber?.trim() || undefined,
  };
}

function buildShipBobProducts(order: Order): ShipBobOrderPayload["products"] | undefined {
  const products: ShipBobOrderPayload["products"] = [];

  for (const item of order.items) {
    const referenceId = item.shipbobReferenceId?.trim();
    if (!referenceId) {
      return undefined;
    }

    products.push({
      name: item.productName,
      reference_id: referenceId,
      quantity: item.quantity,
      unit_price: item.unitPrice,
    });
  }

  return products;
}

export function isShipBobPartner(partner: FulfillmentPartner) {
  const id = slugify(partner.id);
  const name = slugify(partner.name);
  return id === "shipbob" || name === "shipbob";
}

export function resolveFulfillmentDispatchEndpoint(partner: FulfillmentPartner): ResolvedDispatchEndpoint | undefined {
  const config = readDispatchEndpointConfig();
  const keys = endpointCandidates(partner);

  for (const key of keys) {
    const entry = config[key];
    if (!entry) {
      continue;
    }

    if (typeof entry === "string") {
      return {
        url: entry.trim(),
        headers: {},
        timeoutMs: getDefaultTimeoutMs(),
      };
    }

    if (entry.url.trim()) {
      return {
        url: entry.url.trim(),
        headers: normalizeHeaderMap(entry.headers),
        timeoutMs: Number.isFinite(entry.timeoutMs ?? NaN) && (entry.timeoutMs ?? 0) > 0 ? Number(entry.timeoutMs) : getDefaultTimeoutMs(),
      };
    }
  }

  return undefined;
}

export function buildFulfillmentDispatchPayload(
  order: Order,
  partner: FulfillmentPartner,
  inventoryLocation?: InventoryLocation
) {
  return {
    requestedAt: new Date().toISOString(),
    order: {
      id: order.id,
      orderNumber: order.orderNumber,
      customerName: order.customerName,
      status: order.status,
      paymentStatus: order.paymentStatus,
      destination: order.destination,
      shippingAddress: order.shippingAddress
        ? {
            ...order.shippingAddress,
          }
        : undefined,
      total: order.total,
      shippingTotal: order.shippingTotal,
      itemCount: order.itemCount,
      notes: order.notes,
      items: order.items.map((item) => ({
        id: item.id,
        productName: item.productName,
        variantName: item.variantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineTotal: item.lineTotal,
        shipbobReferenceId: item.shipbobReferenceId,
        fulfillmentStatus: item.fulfillmentStatus,
      })),
    },
    fulfillmentPartner: {
      id: partner.id,
      name: partner.name,
      integrationType: partner.integrationType,
      status: partner.status,
      region: partner.region,
      turnaround: partner.turnaround,
      contact: partner.contact,
    },
    inventoryLocation: inventoryLocation
      ? {
          id: inventoryLocation.id,
          name: inventoryLocation.name,
          type: inventoryLocation.type,
          region: inventoryLocation.region,
          contact: inventoryLocation.contact,
        }
      : undefined,
  };
}

export function buildShipBobOrderPayload(
  order: Order,
  partner: FulfillmentPartner,
  inventoryLocation?: InventoryLocation
) {
  const shippingAddress = normalizeShippingAddress(order.shippingAddress);
  if (!shippingAddress) {
    return undefined;
  }

  const products = buildShipBobProducts(order);
  if (!products || !products.length) {
    return undefined;
  }

  const payload: ShipBobOrderPayload = {
    shipping_method: "Standard",
    recipient: {
      name: order.customerName,
      address: {
        address1: shippingAddress.address1,
        address2: shippingAddress.address2,
        company_name: shippingAddress.companyName ?? null,
        city: shippingAddress.city,
        state: shippingAddress.state,
        country: shippingAddress.country,
        zip_code: shippingAddress.zipCode,
      },
      email: shippingAddress.email,
      phone_number: shippingAddress.phoneNumber,
    },
    products,
    reference_id: order.orderNumber,
    order_number: order.orderNumber,
    type: "DTC",
    financials: {
      total_price: order.total,
    },
    purchase_date: order.createdAt,
    tags: [
      {
        name: "Threadline Order",
        value: order.orderNumber,
      },
      {
        name: "Fulfillment Partner",
        value: partner.name,
      },
      ...(inventoryLocation
        ? [
            {
              name: "Inventory Location",
              value: inventoryLocation.name,
            },
          ]
        : []),
    ],
  };

  return payload;
}

export function extractDispatchTrackingNumber(payload: unknown) {
  return deepReadText(payload, [
    "trackingNumber",
    "tracking_number",
    "trackingNo",
    "tracking_no",
    "trackingId",
    "tracking_id",
    "number",
  ]);
}

export function extractDispatchCarrier(payload: unknown, partner: FulfillmentPartner) {
  return (
    deepReadText(payload, [
      "carrier",
      "carrierName",
      "carrier_name",
      "shippingCarrier",
      "shipping_carrier",
      "serviceProvider",
      "service_provider",
    ]) ?? partner.name
  );
}

export function extractDispatchServiceLevel(payload: unknown) {
  return (
    deepReadText(payload, [
      "serviceLevel",
      "service_level",
      "shippingService",
      "shipping_service",
      "shipOption",
      "ship_option",
      "shipOptionName",
      "ship_option_name",
    ]) ?? "Standard"
  );
}

export function extractDispatchEstimatedDeliveryAt(payload: unknown) {
  const value = deepReadText(payload, [
    "estimatedDeliveryAt",
    "estimated_delivery_at",
    "estimatedDelivery",
    "estimated_delivery",
    "estimatedDeliveryDate",
    "estimated_delivery_date",
    "eta",
  ]);

  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

export function extractDispatchPartnerReference(payload: unknown) {
  return deepReadText(payload, [
    "partnerReference",
    "partner_reference",
    "referenceId",
    "reference_id",
    "requestId",
    "request_id",
    "fulfillmentRequestId",
    "fulfillment_request_id",
    "externalReferenceId",
    "external_reference_id",
  ]);
}

export async function sendFulfillmentDispatch(endpoint: ResolvedDispatchEndpoint, payload: unknown) {
  const startedAt = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), endpoint.timeoutMs);

  try {
    const response = await fetch(endpoint.url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        ...endpoint.headers,
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    const bodyText = await response.text();
    const contentType = response.headers.get("content-type") ?? undefined;
    let bodyJson: unknown;

    if (bodyText.trim() && (contentType?.includes("application/json") || bodyText.trim().startsWith("{") || bodyText.trim().startsWith("["))) {
      try {
        bodyJson = JSON.parse(bodyText);
      } catch {
        bodyJson = undefined;
      }
    }

    return {
      endpoint: endpoint.url,
      ok: response.ok,
      status: response.status,
      durationMs: Date.now() - startedAt,
      bodyText,
      bodyJson,
      contentType,
    } satisfies FulfillmentDispatchResult;
  } catch (error) {
    return {
      endpoint: endpoint.url,
      ok: false,
      status: 0,
      durationMs: Date.now() - startedAt,
      bodyText: "",
      error: error instanceof Error ? error.message : "Dispatch failed",
    } satisfies FulfillmentDispatchResult;
  } finally {
    clearTimeout(timeout);
  }
}
