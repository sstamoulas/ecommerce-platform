import { randomUUID } from "node:crypto";
import type { Pool, PoolClient } from "pg";

import { getPostgresPool, ensurePostgresReady } from "@/lib/data/backends/postgresClient";
import type {
  AppendShipmentEventInput,
  CreateFulfillmentRequestInput,
  CreateOrderInput,
  CreateShipmentInput,
  CreateProductInput,
  CreatePromotionInput,
  EcommerceRepository,
  OrderFilters,
  ProductFilters,
  PromotionFilters,
  ShipmentFilters,
  UpdateProductInput,
  UpdatePromotionInput,
  UpdateOrderInput,
} from "@/lib/data/repository";
import type {
  Category,
  FulfillmentPartner,
  FulfillmentRequest,
  InventoryLevel,
  InventoryLocation,
  Order,
  OrderItem,
  ShippingAddress,
  Product,
  Promotion,
  Shipment,
  ShipmentEvent,
} from "@/lib/types";

type DatabaseClient = Pool | PoolClient;

type CategoryRow = {
  id: string;
  name: string;
  slug: string;
  description: string;
  is_featured: boolean;
  count: number;
};

type ProductRow = {
  id: string;
  slug: string;
  name: string;
  description: string;
  category_slug: string;
  category_name: string;
  material: string;
  weave: string;
  color: string;
  width: string;
  unit_type: Product["unitType"];
  unit_increment: number;
  price_cents: number;
  compare_at_price_cents: number | null;
  stock_qty: number;
  minimum_order_qty: number;
  badge: string;
  shipbob_reference_id: string | null;
  visual_tone: Product["visualTone"];
  status: Product["status"];
  featured: boolean;
  specs: string[] | null;
  deal_note: string | null;
};

type PromotionRow = {
  id: string;
  name: string;
  description: string;
  code: string | null;
  type: Promotion["type"];
  status: Promotion["status"];
  discount_summary: string;
  applies_to: string;
  valid_through: string;
};

type InventoryLocationRow = {
  id: string;
  name: string;
  type: InventoryLocation["type"];
  region: string;
  contact: string;
};

type FulfillmentPartnerRow = {
  id: string;
  name: string;
  integration_type: FulfillmentPartner["integrationType"];
  status: FulfillmentPartner["status"];
  region: string;
  turnaround: string;
  contact: string;
};

type InventoryLevelRow = {
  id: string;
  inventory_location_id: string;
  inventory_location_name: string;
  product_id: string;
  product_name: string;
  variant_name: string;
  on_hand_qty: number;
  reserved_qty: number;
  available_qty: number;
  low_stock_threshold: number;
};

type OrderRow = {
  id: string;
  order_number: string;
  customer_name: string;
  status: Order["status"];
  payment_status: Order["paymentStatus"];
  created_at: Date | string;
  total_cents: number;
  shipping_total_cents: number;
  item_count: number;
  fulfillment_partner_name: string;
  destination: string;
  shipping_address: Record<string, unknown> | null;
  notes: string | null;
};

type OrderItemRow = {
  id: string;
  order_id: string;
  position: number;
  product_name: string;
  variant_name: string;
  quantity: number;
  unit_price_cents: number;
  line_total_cents: number;
  shipbob_reference_id: string | null;
  fulfillment_status: OrderItem["fulfillmentStatus"];
};

type ShipmentRow = {
  id: string;
  order_id: string;
  fulfillment_request_id: string | null;
  order_number: string;
  tracking_number: string;
  carrier: string;
  service_level: string;
  status: Shipment["status"] | string;
  partner_name: string;
  destination: string;
  created_at: Date | string;
  shipped_at: Date | string | null;
  delivered_at: Date | string | null;
  estimated_delivery_at: Date | string | null;
  last_event_at: Date | string;
};

type FulfillmentRequestRow = {
  id: string;
  order_id: string;
  order_number: string;
  fulfillment_partner_id: string;
  fulfillment_partner_name: string;
  inventory_location_id: string | null;
  inventory_location_name: string | null;
  status: FulfillmentRequest["status"];
  partner_reference: string | null;
  request_payload: Record<string, unknown>;
  response_payload: Record<string, unknown> | null;
  created_at: Date | string;
  updated_at: Date | string;
};

type ShipmentEventRow = {
  id: string;
  shipment_id: string;
  event_status: string;
  message: string;
  event_at: Date | string;
  source: ShipmentEvent["source"];
};

function requireDatabaseClient() {
  return getPostgresPool();
}

function toCents(value: number) {
  return Math.round(value * 100);
}

function fromCents(value: number) {
  return value / 100;
}

function toIsoString(value: Date | string | null | undefined) {
  if (!value) {
    return undefined;
  }

  return new Date(value).toISOString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readText(record: Record<string, unknown>, keys: string[]) {
  for (const key of keys) {
    const value = record[key];
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function normalizeShippingAddress(value: unknown): ShippingAddress | undefined {
  if (typeof value === "string") {
    try {
      return normalizeShippingAddress(JSON.parse(value));
    } catch {
      return undefined;
    }
  }

  if (!isRecord(value)) {
    return undefined;
  }

  const address1 = readText(value, ["address1", "address_1"]);
  const city = readText(value, ["city"]);
  const state = readText(value, ["state", "province"]);
  const country = readText(value, ["country"]);
  const zipCode = readText(value, ["zipCode", "zip_code", "postalCode", "postal_code"]);

  if (!address1 || !city || !state || !country || !zipCode) {
    return undefined;
  }

  return {
    address1,
    address2: readText(value, ["address2", "address_2"]),
    companyName: readText(value, ["companyName", "company_name"]),
    city,
    state,
    country,
    zipCode,
    email: readText(value, ["email"]),
    phoneNumber: readText(value, ["phoneNumber", "phone_number"]),
  };
}

function ensureStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((entry) => String(entry));
  }

  return [];
}

function createId(prefix: string) {
  return `${prefix}_${randomUUID()}`;
}

function titleizeSlug(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function normalizeShipmentStatus(value: string) {
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
      return normalized as Shipment["status"];
    case "transit":
      return "in_transit";
    default:
      return undefined;
  }
}

function normalizeFulfillmentRequestStatus(value: string | undefined): FulfillmentRequest["status"] {
  const normalized = value?.trim().toLowerCase();

  switch (normalized) {
    case "queued":
    case "sent":
    case "accepted":
    case "rejected":
    case "fulfilled":
    case "failed":
      return normalized;
    default:
      return "queued";
  }
}

async function resolveCategoryNameFromSlug(client: DatabaseClient, categorySlug: string) {
  const { rows } = await client.query<{ name: string }>(
    `SELECT name FROM categories WHERE slug = $1 LIMIT 1`,
    [categorySlug.trim()]
  );

  return rows[0]?.name ?? titleizeSlug(categorySlug);
}

function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    count: row.count,
    isFeatured: row.is_featured,
  };
}

function mapProductRow(row: ProductRow): Product {
  return {
    id: row.id,
    slug: row.slug,
    name: row.name,
    description: row.description,
    categorySlug: row.category_slug,
    categoryName: row.category_name,
    material: row.material,
    weave: row.weave,
    color: row.color,
    width: row.width,
    unitType: row.unit_type,
    unitIncrement: row.unit_increment,
    price: fromCents(row.price_cents),
    compareAtPrice: row.compare_at_price_cents === null ? undefined : fromCents(row.compare_at_price_cents),
    stockQty: row.stock_qty,
    minimumOrderQty: row.minimum_order_qty,
    badge: row.badge,
    shipbobReferenceId: row.shipbob_reference_id ?? undefined,
    visualTone: row.visual_tone,
    status: row.status,
    featured: row.featured,
    specs: ensureStringArray(row.specs),
    dealNote: row.deal_note ?? undefined,
  };
}

function mapPromotionRow(row: PromotionRow): Promotion {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    code: row.code ?? undefined,
    type: row.type,
    status: row.status,
    discountSummary: row.discount_summary,
    appliesTo: row.applies_to,
    validThrough: row.valid_through,
  };
}

function mapInventoryLocationRow(row: InventoryLocationRow): InventoryLocation {
  return {
    id: row.id,
    name: row.name,
    type: row.type,
    region: row.region,
    contact: row.contact,
  };
}

function mapFulfillmentPartnerRow(row: FulfillmentPartnerRow): FulfillmentPartner {
  return {
    id: row.id,
    name: row.name,
    integrationType: row.integration_type,
    status: row.status,
    region: row.region,
    turnaround: row.turnaround,
    contact: row.contact,
  };
}

function mapInventoryLevelRow(row: InventoryLevelRow): InventoryLevel {
  return {
    id: row.id,
    inventoryLocationId: row.inventory_location_id,
    inventoryLocationName: row.inventory_location_name,
    productId: row.product_id,
    productName: row.product_name,
    variantName: row.variant_name,
    onHandQty: row.on_hand_qty,
    reservedQty: row.reserved_qty,
    availableQty: row.available_qty,
    lowStockThreshold: row.low_stock_threshold,
  };
}

function mapOrderItemRow(row: OrderItemRow): OrderItem {
  return {
    id: row.id,
    productName: row.product_name,
    variantName: row.variant_name,
    quantity: row.quantity,
    unitPrice: fromCents(row.unit_price_cents),
    lineTotal: fromCents(row.line_total_cents),
    shipbobReferenceId: row.shipbob_reference_id ?? undefined,
    fulfillmentStatus: row.fulfillment_status,
  };
}

function mapOrderRow(row: OrderRow, items: OrderItem[]): Order {
  return {
    id: row.id,
    orderNumber: row.order_number,
    customerName: row.customer_name,
    status: row.status,
    paymentStatus: row.payment_status,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    total: fromCents(row.total_cents),
    shippingTotal: fromCents(row.shipping_total_cents),
    itemCount: row.item_count,
    fulfillmentPartnerName: row.fulfillment_partner_name,
    destination: row.destination,
    shippingAddress: normalizeShippingAddress(row.shipping_address),
    items,
    notes: row.notes ?? undefined,
  };
}

function mapShipmentEventRow(row: ShipmentEventRow): ShipmentEvent {
  return {
    id: row.id,
    eventStatus: row.event_status,
    message: row.message,
    eventAt: toIsoString(row.event_at) ?? new Date().toISOString(),
    source: row.source,
  };
}

function mapShipmentRow(row: ShipmentRow, events: ShipmentEvent[]): Shipment {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    fulfillmentRequestId: row.fulfillment_request_id ?? undefined,
    trackingNumber: row.tracking_number,
    carrier: row.carrier,
    serviceLevel: row.service_level,
    status: row.status as Shipment["status"],
    partnerName: row.partner_name,
    destination: row.destination,
    shippedAt: toIsoString(row.shipped_at),
    deliveredAt: toIsoString(row.delivered_at),
    estimatedDeliveryAt: toIsoString(row.estimated_delivery_at),
    events,
  };
}

function mapFulfillmentRequestRow(row: FulfillmentRequestRow): FulfillmentRequest {
  return {
    id: row.id,
    orderId: row.order_id,
    orderNumber: row.order_number,
    fulfillmentPartnerId: row.fulfillment_partner_id,
    fulfillmentPartnerName: row.fulfillment_partner_name,
    inventoryLocationId: row.inventory_location_id ?? undefined,
    inventoryLocationName: row.inventory_location_name ?? undefined,
    status: row.status,
    partnerReference: row.partner_reference ?? undefined,
    requestPayload: row.request_payload,
    responsePayload: row.response_payload ?? undefined,
    createdAt: toIsoString(row.created_at) ?? new Date().toISOString(),
    updatedAt: toIsoString(row.updated_at) ?? new Date().toISOString(),
  };
}

async function loadOrderItems(client: DatabaseClient, orderIds: string[]) {
  if (!orderIds.length) {
    return new Map<string, OrderItem[]>();
  }

  const { rows } = await client.query<OrderItemRow>(
    `SELECT
      id, order_id, position, product_name, variant_name, quantity,
      unit_price_cents, line_total_cents, shipbob_reference_id, fulfillment_status
     FROM order_items
     WHERE order_id = ANY($1::text[])
     ORDER BY order_id ASC, position ASC`,
    [orderIds]
  );

  const itemsByOrderId = new Map<string, OrderItem[]>();

  for (const row of rows) {
    const items = itemsByOrderId.get(row.order_id) ?? [];
    items.push(mapOrderItemRow(row));
    itemsByOrderId.set(row.order_id, items);
  }

  return itemsByOrderId;
}

async function loadShipmentEvents(client: DatabaseClient, shipmentIds: string[]) {
  if (!shipmentIds.length) {
    return new Map<string, ShipmentEvent[]>();
  }

  const { rows } = await client.query<ShipmentEventRow>(
    `SELECT id, shipment_id, event_status, message, event_at, source
     FROM shipment_events
     WHERE shipment_id = ANY($1::text[])
     ORDER BY shipment_id ASC, event_at ASC`,
    [shipmentIds]
  );

  const eventsByShipmentId = new Map<string, ShipmentEvent[]>();

  for (const row of rows) {
    const events = eventsByShipmentId.get(row.shipment_id) ?? [];
    events.push(mapShipmentEventRow(row));
    eventsByShipmentId.set(row.shipment_id, events);
  }

  return eventsByShipmentId;
}

async function fetchOrders(client: DatabaseClient, filters?: OrderFilters) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters?.status?.length) {
    params.push(filters.status);
    clauses.push(`status = ANY($${params.length}::text[])`);
  }

  const sql = `
    SELECT
      id, order_number, customer_name, status, payment_status, created_at,
      total_cents, shipping_total_cents, item_count, fulfillment_partner_name,
      destination, shipping_address, notes
    FROM orders
    ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY created_at DESC, order_number DESC
  `;

  const { rows } = await client.query<OrderRow>(sql, params);
  const itemsByOrderId = await loadOrderItems(client, rows.map((row) => row.id));

  return rows.map((row) => mapOrderRow(row, itemsByOrderId.get(row.id) ?? []));
}

async function fetchOrderById(client: DatabaseClient, orderId: string) {
  const { rows } = await client.query<OrderRow>(
    `SELECT
      id, order_number, customer_name, status, payment_status, created_at,
      total_cents, shipping_total_cents, item_count, fulfillment_partner_name,
      destination, shipping_address, notes
     FROM orders
     WHERE id = $1
     LIMIT 1`,
    [orderId.trim()]
  );

  const row = rows[0];
  if (!row) {
    return undefined;
  }

  const itemsByOrderId = await loadOrderItems(client, [row.id]);
  return mapOrderRow(row, itemsByOrderId.get(row.id) ?? []);
}

async function fetchShipments(client: DatabaseClient, filters?: ShipmentFilters) {
  const clauses: string[] = [];
  const params: unknown[] = [];

  if (filters?.status?.length) {
    params.push(filters.status);
    clauses.push(`status = ANY($${params.length}::text[])`);
  }

  const sql = `
    SELECT
      id, order_id, fulfillment_request_id, order_number, tracking_number, carrier, service_level,
      status, partner_name, destination, created_at, shipped_at, delivered_at,
      estimated_delivery_at, last_event_at
    FROM shipments
    ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
    ORDER BY last_event_at DESC, tracking_number DESC
  `;

  const { rows } = await client.query<ShipmentRow>(sql, params);
  const eventsByShipmentId = await loadShipmentEvents(client, rows.map((row) => row.id));

  return rows.map((row) => mapShipmentRow(row, eventsByShipmentId.get(row.id) ?? []));
}

async function fetchShipmentByIdentifier(client: DatabaseClient, identifier: string) {
  const { rows } = await client.query<ShipmentRow>(
    `SELECT
      id, order_id, fulfillment_request_id, order_number, tracking_number, carrier, service_level,
      status, partner_name, destination, created_at, shipped_at, delivered_at,
      estimated_delivery_at, last_event_at
     FROM shipments
     WHERE id = $1 OR lower(tracking_number) = lower($1)
     LIMIT 1`,
    [identifier.trim()]
  );

  const shipmentRow = rows[0];
  if (!shipmentRow) {
    return undefined;
  }

  const eventsByShipmentId = await loadShipmentEvents(client, [shipmentRow.id]);
  return mapShipmentRow(shipmentRow, eventsByShipmentId.get(shipmentRow.id) ?? []);
}

async function fetchShipmentByOrderId(client: DatabaseClient, orderId: string) {
  const { rows } = await client.query<ShipmentRow>(
    `SELECT
      id, order_id, fulfillment_request_id, order_number, tracking_number, carrier, service_level,
      status, partner_name, destination, created_at, shipped_at, delivered_at,
      estimated_delivery_at, last_event_at
     FROM shipments
     WHERE order_id = $1
     ORDER BY last_event_at DESC, tracking_number DESC
     LIMIT 1`,
    [orderId.trim()]
  );

  const shipmentRow = rows[0];
  if (!shipmentRow) {
    return undefined;
  }

  const eventsByShipmentId = await loadShipmentEvents(client, [shipmentRow.id]);
  return mapShipmentRow(shipmentRow, eventsByShipmentId.get(shipmentRow.id) ?? []);
}

async function fetchFulfillmentRequests(client: DatabaseClient) {
  const { rows } = await client.query<FulfillmentRequestRow>(
    `SELECT
      id, order_id, order_number, fulfillment_partner_id, fulfillment_partner_name,
      inventory_location_id, inventory_location_name, status, partner_reference,
      request_payload, response_payload, created_at, updated_at
     FROM fulfillment_requests
     ORDER BY created_at DESC, id DESC`
  );

  return rows.map(mapFulfillmentRequestRow);
}

async function createShipmentRecord(client: DatabaseClient, input: CreateShipmentInput) {
  const shipmentId = createId("ship");
  const createdAt = new Date().toISOString();

  await client.query(
    `INSERT INTO shipments (
      id, order_id, fulfillment_request_id, order_number, tracking_number, carrier,
      service_level, status, partner_name, destination, created_at, shipped_at,
      delivered_at, estimated_delivery_at, last_event_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5, $6,
      $7, $8, $9, $10, $11, $12,
      $13, $14, $15, $16
    )`,
    [
      shipmentId,
      input.orderId.trim(),
      input.fulfillmentRequestId ?? null,
      input.orderNumber.trim(),
      input.trackingNumber.trim(),
      input.carrier.trim(),
      input.serviceLevel.trim(),
      input.status ?? "pending",
      input.partnerName.trim(),
      input.destination.trim(),
      createdAt,
      input.shippedAt ?? null,
      input.deliveredAt ?? null,
      input.estimatedDeliveryAt ?? null,
      input.shippedAt ?? createdAt,
      createdAt,
    ]
  );

  return fetchShipmentByIdentifier(client, shipmentId);
}

async function createFulfillmentRequestRecord(client: DatabaseClient, input: CreateFulfillmentRequestInput) {
  const requestId = createId("request");
  const createdAt = new Date().toISOString();

  await client.query(
    `INSERT INTO fulfillment_requests (
      id, order_id, order_number, fulfillment_partner_id, fulfillment_partner_name,
      inventory_location_id, inventory_location_name, status, partner_reference,
      request_payload, response_payload, created_at, updated_at
    )
    VALUES (
      $1, $2, $3, $4, $5,
      $6, $7, $8, $9,
      $10, $11, $12, $13
    )`,
    [
      requestId,
      input.orderId.trim(),
      input.orderNumber.trim(),
      input.fulfillmentPartnerId.trim(),
      input.fulfillmentPartnerName.trim(),
      input.inventoryLocationId?.trim() || null,
      input.inventoryLocationName?.trim() || null,
      normalizeFulfillmentRequestStatus(input.status),
      input.partnerReference?.trim() || null,
      input.requestPayload,
      input.responsePayload ?? null,
      createdAt,
      createdAt,
    ]
  );

  const { rows } = await client.query<FulfillmentRequestRow>(
    `SELECT
      id, order_id, order_number, fulfillment_partner_id, fulfillment_partner_name,
      inventory_location_id, inventory_location_name, status, partner_reference,
      request_payload, response_payload, created_at, updated_at
     FROM fulfillment_requests
     WHERE id = $1
     LIMIT 1`,
    [requestId]
  );

  const row = rows[0];
  if (!row) {
    throw new Error("Fulfillment request creation failed");
  }

  return mapFulfillmentRequestRow(row);
}

async function fetchProductById(client: DatabaseClient, productId: string) {
  const { rows } = await client.query<ProductRow>(
    `SELECT
      id, slug, name, description, category_slug, category_name, material, weave,
      color, width, unit_type, unit_increment, price_cents, compare_at_price_cents,
      stock_qty, minimum_order_qty, badge, shipbob_reference_id, visual_tone, status, featured, specs, deal_note
     FROM products
     WHERE id = $1
     LIMIT 1`,
    [productId.trim()]
  );

  return rows[0] ? mapProductRow(rows[0]) : undefined;
}

async function fetchPromotionById(client: DatabaseClient, promotionId: string) {
  const { rows } = await client.query<PromotionRow>(
    `SELECT
      id, name, description, code, type, status, discount_summary, applies_to, valid_through
     FROM promotions
     WHERE id = $1
     LIMIT 1`,
    [promotionId.trim()]
  );

  return rows[0] ? mapPromotionRow(rows[0]) : undefined;
}

export function createPostgresRepository(): EcommerceRepository {
  return {
    backend: "postgres",
    async listCategories() {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();

      const { rows } = await pool.query<CategoryRow>(
        `SELECT
          c.id,
          c.name,
          c.slug,
          c.description,
          c.is_featured,
          COALESCE(p.count, 0)::int AS count
         FROM categories c
         LEFT JOIN (
           SELECT category_slug, COUNT(*)::int AS count
           FROM products
           GROUP BY category_slug
         ) p ON p.category_slug = c.slug
         ORDER BY c.name ASC`
      );

      return rows.map(mapCategoryRow);
    },
    async listProducts(filters?: ProductFilters) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();

      const clauses: string[] = [];
      const params: unknown[] = [];

      if (filters?.query?.trim()) {
        const query = `%${filters.query.trim()}%`;
        params.push(query);
        const param = `$${params.length}`;
        clauses.push(`(
          name ILIKE ${param}
          OR description ILIKE ${param}
          OR material ILIKE ${param}
          OR weave ILIKE ${param}
          OR color ILIKE ${param}
        )`);
      }

      if (filters?.category?.trim()) {
        params.push(filters.category.trim());
        clauses.push(`category_slug = $${params.length}`);
      }

      if (filters?.status) {
        params.push(filters.status);
        clauses.push(`status = $${params.length}`);
      }

      if (filters?.featured !== undefined) {
        params.push(filters.featured);
        clauses.push(`featured = $${params.length}`);
      }

      const sql = `
        SELECT
          id, slug, name, description, category_slug, category_name, material, weave,
          color, width, unit_type, unit_increment, price_cents, compare_at_price_cents,
          stock_qty, minimum_order_qty, badge, shipbob_reference_id, visual_tone, status, featured, specs, deal_note
        FROM products
        ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
        ORDER BY featured DESC, name ASC, slug ASC
      `;

      const { rows } = await pool.query<ProductRow>(sql, params);
      return rows.map(mapProductRow);
    },
    async getProductBySlug(slug: string) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();

      const { rows } = await pool.query<ProductRow>(
        `SELECT
          id, slug, name, description, category_slug, category_name, material, weave,
          color, width, unit_type, unit_increment, price_cents, compare_at_price_cents,
          stock_qty, minimum_order_qty, badge, shipbob_reference_id, visual_tone, status, featured, specs, deal_note
         FROM products
         WHERE slug = $1
         LIMIT 1`,
        [slug.trim()]
      );

      return rows[0] ? mapProductRow(rows[0]) : undefined;
    },
    async getProductById(productId: string) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      return fetchProductById(pool, productId);
    },
    async createProduct(input: CreateProductInput) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      const client = await pool.connect();
      const productId = createId("prod");
      const createdAt = new Date().toISOString();

      try {
        await client.query("BEGIN");
        const categoryName = await resolveCategoryNameFromSlug(client, input.categorySlug);

        await client.query(
          `INSERT INTO products (
            id, slug, name, description, category_slug, category_name,
            material, weave, color, width, unit_type, unit_increment,
            price_cents, compare_at_price_cents, stock_qty, minimum_order_qty,
            badge, shipbob_reference_id, visual_tone, status, featured, specs, deal_note
          )
          VALUES (
            $1, $2, $3, $4, $5, $6,
            $7, $8, $9, $10, $11, $12,
            $13, $14, $15, $16,
            $17, $18, $19, $20, $21, $22, $23
          )`,
          [
            productId,
            input.slug.trim(),
            input.name.trim(),
            input.description.trim(),
            input.categorySlug.trim(),
            categoryName,
            input.material.trim(),
            input.weave.trim(),
            input.color.trim(),
            input.width.trim(),
            input.unitType,
            input.unitIncrement,
            toCents(input.price),
            input.compareAtPrice === undefined ? null : toCents(input.compareAtPrice),
            input.stockQty,
            input.minimumOrderQty,
            input.badge.trim(),
            input.shipbobReferenceId?.trim() || null,
            input.visualTone,
            input.status,
            input.featured,
            input.specs,
            input.dealNote?.trim() || null,
          ]
        );

        await client.query(
          `UPDATE inventory_levels
           SET product_name = $1
           WHERE product_id = $2`,
          [input.name.trim(), productId]
        );

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      const created = await fetchProductById(pool, productId);
      if (!created) {
        throw new Error("Product creation failed");
      }

      return created;
    },
    async updateProduct(productId: string, input: UpdateProductInput) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const current = await fetchProductById(client, productId);
        if (!current) {
          await client.query("ROLLBACK");
          return undefined;
        }

        const nextCategorySlug = input.categorySlug?.trim() ?? current.categorySlug;
        const categoryName =
          input.categorySlug !== undefined
            ? await resolveCategoryNameFromSlug(client, nextCategorySlug)
            : current.categoryName;
        const next = {
          ...current,
          slug: input.slug?.trim() ?? current.slug,
          name: input.name?.trim() ?? current.name,
          description: input.description?.trim() ?? current.description,
          categorySlug: nextCategorySlug,
          categoryName,
          material: input.material?.trim() ?? current.material,
          weave: input.weave?.trim() ?? current.weave,
          color: input.color?.trim() ?? current.color,
          width: input.width?.trim() ?? current.width,
          unitType: input.unitType ?? current.unitType,
          unitIncrement: input.unitIncrement ?? current.unitIncrement,
          price: input.price ?? current.price,
          compareAtPrice: input.compareAtPrice === undefined ? current.compareAtPrice : input.compareAtPrice,
          stockQty: input.stockQty ?? current.stockQty,
          minimumOrderQty: input.minimumOrderQty ?? current.minimumOrderQty,
          badge: input.badge?.trim() ?? current.badge,
          shipbobReferenceId:
            input.shipbobReferenceId !== undefined ? input.shipbobReferenceId?.trim() || undefined : current.shipbobReferenceId,
          visualTone: input.visualTone ?? current.visualTone,
          status: input.status ?? current.status,
          featured: input.featured ?? current.featured,
          specs: input.specs ? [...input.specs] : current.specs,
          dealNote: input.dealNote === undefined ? current.dealNote : input.dealNote?.trim() || undefined,
        };

        await client.query(
          `UPDATE products
           SET slug = $1,
               name = $2,
               description = $3,
               category_slug = $4,
               category_name = $5,
               material = $6,
               weave = $7,
               color = $8,
               width = $9,
               unit_type = $10,
               unit_increment = $11,
               price_cents = $12,
               compare_at_price_cents = $13,
               stock_qty = $14,
               minimum_order_qty = $15,
               badge = $16,
               shipbob_reference_id = $17,
               visual_tone = $18,
               status = $19,
               featured = $20,
               specs = $21,
               deal_note = $22
           WHERE id = $23`,
          [
            next.slug,
            next.name,
            next.description,
            next.categorySlug,
            next.categoryName,
            next.material,
            next.weave,
            next.color,
            next.width,
            next.unitType,
            next.unitIncrement,
            toCents(next.price),
            next.compareAtPrice === undefined ? null : toCents(next.compareAtPrice),
            next.stockQty,
            next.minimumOrderQty,
            next.badge,
            next.shipbobReferenceId ?? null,
            next.visualTone,
            next.status,
            next.featured,
            next.specs,
            next.dealNote ?? null,
            productId,
          ]
        );

        await client.query(
          `UPDATE inventory_levels
           SET product_name = $1
           WHERE product_id = $2`,
          [next.name, productId]
        );

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      return fetchProductById(pool, productId);
    },
    async deleteProduct(productId: string) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      const result = await pool.query(`DELETE FROM products WHERE id = $1`, [productId.trim()]);
      return (result.rowCount ?? 0) > 0;
    },
    async listPromotions(filters?: PromotionFilters) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();

      const clauses: string[] = [];
      const params: unknown[] = [];

      if (filters?.status?.trim()) {
        params.push(filters.status.trim());
        clauses.push(`status = $${params.length}`);
      }

      const sql = `
        SELECT
          id, name, description, code, type, status, discount_summary, applies_to, valid_through
        FROM promotions
        ${clauses.length ? `WHERE ${clauses.join(" AND ")}` : ""}
        ORDER BY valid_through DESC, name ASC
      `;

      const { rows } = await pool.query<PromotionRow>(sql, params);
      return rows.map(mapPromotionRow);
    },
    async getPromotionById(promotionId: string) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      return fetchPromotionById(pool, promotionId);
    },
    async createPromotion(input: CreatePromotionInput) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      const promotionId = createId("promo");

      await pool.query(
        `INSERT INTO promotions (
          id, name, description, code, type, status, discount_summary, applies_to, valid_through
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
        [
          promotionId,
          input.name.trim(),
          input.description.trim(),
          input.code?.trim() || null,
          input.type,
          input.status,
          input.discountSummary.trim(),
          input.appliesTo.trim(),
          input.validThrough.trim(),
        ]
      );

      const created = await fetchPromotionById(pool, promotionId);
      if (!created) {
        throw new Error("Promotion creation failed");
      }

      return created;
    },
    async updatePromotion(promotionId: string, input: UpdatePromotionInput) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const current = await fetchPromotionById(client, promotionId);
        if (!current) {
          await client.query("ROLLBACK");
          return undefined;
        }

        const next = {
          ...current,
          name: input.name?.trim() ?? current.name,
          description: input.description?.trim() ?? current.description,
          code: input.code === undefined ? current.code : input.code?.trim() || undefined,
          type: input.type ?? current.type,
          status: input.status ?? current.status,
          discountSummary: input.discountSummary?.trim() ?? current.discountSummary,
          appliesTo: input.appliesTo?.trim() ?? current.appliesTo,
          validThrough: input.validThrough?.trim() ?? current.validThrough,
        };

        await client.query(
          `UPDATE promotions
           SET name = $1,
               description = $2,
               code = $3,
               type = $4,
               status = $5,
               discount_summary = $6,
               applies_to = $7,
               valid_through = $8
           WHERE id = $9`,
          [
            next.name,
            next.description,
            next.code ?? null,
            next.type,
            next.status,
            next.discountSummary,
            next.appliesTo,
            next.validThrough,
            promotionId,
          ]
        );

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      return fetchPromotionById(pool, promotionId);
    },
    async deletePromotion(promotionId: string) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      const result = await pool.query(`DELETE FROM promotions WHERE id = $1`, [promotionId.trim()]);
      return (result.rowCount ?? 0) > 0;
    },
    async listOrders(filters?: OrderFilters) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      return fetchOrders(pool, filters);
    },
    async getOrderById(orderId: string) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      return fetchOrderById(pool, orderId);
    },
    async createOrder(input: CreateOrderInput) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      const client = await pool.connect();
      const createdAt = new Date().toISOString();
      const orderId = createId("order");
      let orderNumber = "";
      let status = input.status ?? "pending_payment";
      let paymentStatus = input.paymentStatus ?? "pending";

      try {
        await client.query("BEGIN");

        const orderNumberResult = await client.query<{ order_number: string }>(
          `SELECT 'TX-' || to_char(nextval('order_number_seq'), 'FM0000') AS order_number`
        );
        orderNumber = orderNumberResult.rows[0]?.order_number ?? `TX-${Date.now()}`;

        await client.query(
          `INSERT INTO orders (
            id, order_number, customer_name, status, payment_status, created_at,
            total_cents, shipping_total_cents, item_count, fulfillment_partner_name,
            destination, shipping_address, notes, updated_at
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)`,
          [
            orderId,
            orderNumber,
            input.customerName,
            status,
            paymentStatus,
            createdAt,
            toCents(input.total),
            toCents(input.shippingTotal),
            input.items.length,
            input.fulfillmentPartnerName,
            input.destination,
            input.shippingAddress ? JSON.stringify(input.shippingAddress) : null,
            input.notes ?? null,
            createdAt,
          ]
        );

        for (const [position, item] of input.items.entries()) {
          await client.query(
            `INSERT INTO order_items (
              id, order_id, position, product_name, variant_name, quantity,
              unit_price_cents, line_total_cents, shipbob_reference_id, fulfillment_status
            )
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
            [
              item.id,
              orderId,
              position + 1,
              item.productName,
              item.variantName,
              item.quantity,
              toCents(item.unitPrice),
              toCents(item.lineTotal),
              item.shipbobReferenceId?.trim() || null,
              item.fulfillmentStatus,
            ]
          );
        }

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      return {
        id: orderId,
        orderNumber,
        customerName: input.customerName,
        status,
        paymentStatus,
        createdAt,
        total: input.total,
        shippingTotal: input.shippingTotal,
        itemCount: input.items.length,
        fulfillmentPartnerName: input.fulfillmentPartnerName,
        destination: input.destination,
        shippingAddress: input.shippingAddress ? { ...input.shippingAddress } : undefined,
        items: input.items.map((item) => ({ ...item, shipbobReferenceId: item.shipbobReferenceId?.trim() || undefined })),
        notes: input.notes,
      };
    },
    async updateOrder(orderId: string, input: UpdateOrderInput) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();

      const sets: string[] = [];
      const params: unknown[] = [];

      if (input.status !== undefined) {
        params.push(input.status);
        sets.push(`status = $${params.length}`);
      }

      if (input.customerName !== undefined) {
        params.push(input.customerName);
        sets.push(`customer_name = $${params.length}`);
      }

      if (input.paymentStatus !== undefined) {
        params.push(input.paymentStatus);
        sets.push(`payment_status = $${params.length}`);
      }

      if (input.fulfillmentPartnerName !== undefined) {
        params.push(input.fulfillmentPartnerName);
        sets.push(`fulfillment_partner_name = $${params.length}`);
      }

      if (input.destination !== undefined) {
        params.push(input.destination);
        sets.push(`destination = $${params.length}`);
      }

      if (input.shippingAddress !== undefined) {
        params.push(input.shippingAddress ? JSON.stringify(input.shippingAddress) : null);
        sets.push(`shipping_address = $${params.length}`);
      }

      if (input.notes !== undefined) {
        params.push(input.notes ?? null);
        sets.push(`notes = $${params.length}`);
      }

      if (input.total !== undefined) {
        params.push(toCents(input.total));
        sets.push(`total_cents = $${params.length}`);
      }

      if (input.shippingTotal !== undefined) {
        params.push(toCents(input.shippingTotal));
        sets.push(`shipping_total_cents = $${params.length}`);
      }

      if (!sets.length) {
        return fetchOrderById(pool, orderId);
      }

      params.push(orderId.trim());
      const result = await pool.query(
        `UPDATE orders
         SET ${sets.join(", ")}, updated_at = now()
         WHERE id = $${params.length}`,
        params
      );

      if (!result.rowCount) {
        return undefined;
      }

      return fetchOrderById(pool, orderId);
    },
    async listShipments(filters?: ShipmentFilters) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      return fetchShipments(pool, filters);
    },
    async getShipmentById(shipmentId: string) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      return fetchShipmentByIdentifier(pool, shipmentId);
    },
    async getShipmentByTrackingNumber(trackingNumber: string) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      return fetchShipmentByIdentifier(pool, trackingNumber);
    },
    async getShipmentByOrderId(orderId: string) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      return fetchShipmentByOrderId(pool, orderId);
    },
    async createShipment(input: CreateShipmentInput) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const shipment = await createShipmentRecord(client, input);
        await client.query("COMMIT");
        if (!shipment) {
          throw new Error("Shipment creation failed");
        }
        return shipment;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
    async appendShipmentEvent(shipmentId: string, input: AppendShipmentEventInput) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      const client = await pool.connect();
      const eventAt = input.eventAt ?? new Date().toISOString();
      const eventId = createId("event");
      const shouldUpdateShippedAt = input.eventStatus === "shipped" || input.eventStatus === "in_transit";
      const shouldUpdateDeliveredAt = input.eventStatus === "delivered";

      try {
        await client.query("BEGIN");

        const { rows } = await client.query<ShipmentRow>(
          `SELECT
            id, order_id, fulfillment_request_id, order_number, tracking_number, carrier, service_level,
            status, partner_name, destination, created_at, shipped_at, delivered_at,
            estimated_delivery_at, last_event_at
           FROM shipments
           WHERE id = $1 OR lower(tracking_number) = lower($1)
           LIMIT 1
           FOR UPDATE`,
          [shipmentId.trim()]
        );

        const shipmentRow = rows[0];
        if (!shipmentRow) {
          await client.query("ROLLBACK");
          return undefined;
        }

        await client.query(
          `INSERT INTO shipment_events (id, shipment_id, event_status, message, event_at, source)
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [eventId, shipmentRow.id, input.eventStatus, input.message, eventAt, input.source]
        );

        await client.query(
          `UPDATE shipments
           SET status = COALESCE($1, status),
               shipped_at = CASE WHEN $2::boolean THEN COALESCE(shipped_at, $3) ELSE shipped_at END,
               delivered_at = CASE WHEN $4::boolean THEN COALESCE(delivered_at, $3) ELSE delivered_at END,
               last_event_at = $3,
               updated_at = now()
           WHERE id = $5`,
          [normalizeShipmentStatus(input.eventStatus), shouldUpdateShippedAt, eventAt, shouldUpdateDeliveredAt, shipmentRow.id]
        );

        await client.query("COMMIT");
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }

      return {
        id: eventId,
        eventStatus: input.eventStatus,
        message: input.message,
        eventAt,
        source: input.source,
      };
    },
    async listInventoryLocations() {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();

      const { rows } = await pool.query<InventoryLocationRow>(
        `SELECT id, name, type, region, contact
         FROM inventory_locations
         ORDER BY name ASC`
      );

      return rows.map(mapInventoryLocationRow);
    },
    async listInventoryLevels() {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();

      const { rows } = await pool.query<InventoryLevelRow>(
        `SELECT
          id, inventory_location_id, inventory_location_name, product_id, product_name,
          variant_name, on_hand_qty, reserved_qty, available_qty, low_stock_threshold
         FROM inventory_levels
         ORDER BY inventory_location_name ASC, product_name ASC, variant_name ASC`
      );

      return rows.map(mapInventoryLevelRow);
    },
    async listFulfillmentPartners() {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();

      const { rows } = await pool.query<FulfillmentPartnerRow>(
        `SELECT id, name, integration_type, status, region, turnaround, contact
         FROM fulfillment_partners
         ORDER BY name ASC`
      );

      return rows.map(mapFulfillmentPartnerRow);
    },
    async listFulfillmentRequests() {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      return fetchFulfillmentRequests(pool);
    },
    async createFulfillmentRequest(input: CreateFulfillmentRequestInput) {
      await ensurePostgresReady();
      const pool = requireDatabaseClient();
      const client = await pool.connect();

      try {
        await client.query("BEGIN");
        const request = await createFulfillmentRequestRecord(client, input);
        await client.query("COMMIT");
        return request;
      } catch (error) {
        await client.query("ROLLBACK");
        throw error;
      } finally {
        client.release();
      }
    },
  };
}
