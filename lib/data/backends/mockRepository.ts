import {
  categories,
  fulfillmentPartners,
  fulfillmentRequests,
  inventoryLevels,
  inventoryLocations,
  orders,
  products,
  promotions,
  shipments,
} from "@/lib/mock-data";
import type {
  AppendShipmentEventInput,
  CreateOrderInput,
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
  CreateShipmentInput,
  CreateFulfillmentRequestInput,
} from "@/lib/data/repository";
import type { FulfillmentRequestStatus, ShipmentStatus } from "@/lib/types";

const state = {
  categories: JSON.parse(JSON.stringify(categories)) as typeof categories,
  products: JSON.parse(JSON.stringify(products)) as typeof products,
  promotions: JSON.parse(JSON.stringify(promotions)) as typeof promotions,
  orders: JSON.parse(JSON.stringify(orders)) as typeof orders,
  shipments: JSON.parse(JSON.stringify(shipments)) as typeof shipments,
  fulfillmentRequests: JSON.parse(JSON.stringify(fulfillmentRequests)) as typeof fulfillmentRequests,
  inventoryLocations: JSON.parse(JSON.stringify(inventoryLocations)) as typeof inventoryLocations,
  inventoryLevels: JSON.parse(JSON.stringify(inventoryLevels)) as typeof inventoryLevels,
  fulfillmentPartners: JSON.parse(JSON.stringify(fulfillmentPartners)) as typeof fulfillmentPartners,
};

function createProductId() {
  return `prod_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function createPromotionId() {
  return `promo_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function createShipmentId() {
  return `ship_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function createFulfillmentRequestId() {
  return `request_${Date.now()}_${Math.random().toString(16).slice(2, 8)}`;
}

function titleizeSlug(value: string) {
  return value
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function resolveCategoryName(categorySlug: string) {
  return state.categories.find((category) => category.slug === categorySlug)?.name ?? titleizeSlug(categorySlug);
}

function hasDuplicateShipbobReferenceId(referenceId: string, productId?: string) {
  const normalized = referenceId.trim();
  if (!normalized) {
    return false;
  }

  return state.products.some(
    (product) => product.shipbobReferenceId?.trim() === normalized && product.id !== productId
  );
}

function clone<T>(value: T): T;
function clone<T>(value: T | undefined): T | undefined;
function clone<T>(value: T | undefined) {
  if (value === undefined) {
    return undefined;
  }

  return JSON.parse(JSON.stringify(value)) as T;
}

function matchesQuery(value: string, query: string) {
  return value.toLowerCase().includes(query.toLowerCase());
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
      return normalized as ShipmentStatus;
    case "transit":
      return "in_transit";
    default:
      return undefined;
  }
}

function normalizeRequestStatus(value: string | undefined): FulfillmentRequestStatus {
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

export function createMockRepository(): EcommerceRepository {
  return {
    backend: "mock",
    async listCategories() {
      return clone(state.categories);
    },
    async listProducts(filters?: ProductFilters) {
      const query = filters?.query?.trim() ?? "";
      const category = filters?.category?.trim() ?? "";
      const status = filters?.status?.trim() ?? "";
      const featured = filters?.featured;

      const data = state.products.filter((product) => {
        const matchesSearch =
          !query ||
          matchesQuery(product.name, query) ||
          matchesQuery(product.description, query) ||
          matchesQuery(product.material, query) ||
          matchesQuery(product.weave, query) ||
          matchesQuery(product.color, query);
        const matchesCategory = !category || product.categorySlug === category;
        const matchesStatus = !status || product.status === status;
        const matchesFeatured = featured === undefined || product.featured === featured;

        return matchesSearch && matchesCategory && matchesStatus && matchesFeatured;
      });

      return clone(data);
    },
    async getProductBySlug(slug: string) {
      return clone(state.products.find((product) => product.slug === slug));
    },
    async getProductById(productId: string) {
      return clone(state.products.find((product) => product.id === productId));
    },
    async createProduct(input: CreateProductInput) {
      if (state.products.some((product) => product.slug === input.slug)) {
        throw new Error("Product slug already exists");
      }

      if (input.shipbobReferenceId && hasDuplicateShipbobReferenceId(input.shipbobReferenceId)) {
        throw new Error("ShipBob reference ID already exists");
      }

      const product = {
        id: createProductId(),
        slug: input.slug,
        name: input.name,
        description: input.description,
        categorySlug: input.categorySlug,
        categoryName: resolveCategoryName(input.categorySlug),
        material: input.material,
        weave: input.weave,
        color: input.color,
        width: input.width,
        unitType: input.unitType,
        unitIncrement: input.unitIncrement,
        price: input.price,
        compareAtPrice: input.compareAtPrice,
        stockQty: input.stockQty,
        minimumOrderQty: input.minimumOrderQty,
        badge: input.badge,
        shipbobReferenceId: input.shipbobReferenceId?.trim() || undefined,
        visualTone: input.visualTone,
        status: input.status,
        featured: input.featured,
        specs: [...input.specs],
        dealNote: input.dealNote,
      };

      state.products.unshift(product);
      return clone(product);
    },
    async updateProduct(productId: string, input: UpdateProductInput) {
      const product = state.products.find((entry) => entry.id === productId);
      if (!product) return undefined;

      if (
        input.shipbobReferenceId !== undefined &&
        input.shipbobReferenceId &&
        hasDuplicateShipbobReferenceId(input.shipbobReferenceId, productId)
      ) {
        throw new Error("ShipBob reference ID already exists");
      }

      if (input.slug !== undefined) {
        product.slug = input.slug;
      }
      if (input.name !== undefined) {
        product.name = input.name;
      }
      if (input.description !== undefined) {
        product.description = input.description;
      }
      if (input.categorySlug !== undefined) {
        product.categorySlug = input.categorySlug;
        product.categoryName = resolveCategoryName(input.categorySlug);
      }
      if (input.material !== undefined) {
        product.material = input.material;
      }
      if (input.weave !== undefined) {
        product.weave = input.weave;
      }
      if (input.color !== undefined) {
        product.color = input.color;
      }
      if (input.width !== undefined) {
        product.width = input.width;
      }
      if (input.unitType !== undefined) {
        product.unitType = input.unitType;
      }
      if (input.unitIncrement !== undefined) {
        product.unitIncrement = input.unitIncrement;
      }
      if (input.price !== undefined) {
        product.price = input.price;
      }
      if (input.compareAtPrice !== undefined) {
        product.compareAtPrice = input.compareAtPrice;
      }
      if (input.stockQty !== undefined) {
        product.stockQty = input.stockQty;
      }
      if (input.minimumOrderQty !== undefined) {
        product.minimumOrderQty = input.minimumOrderQty;
      }
      if (input.badge !== undefined) {
        product.badge = input.badge;
      }
      if (input.shipbobReferenceId !== undefined) {
        product.shipbobReferenceId = input.shipbobReferenceId.trim() || undefined;
      }
      if (input.visualTone !== undefined) {
        product.visualTone = input.visualTone;
      }
      if (input.status !== undefined) {
        product.status = input.status;
      }
      if (input.featured !== undefined) {
        product.featured = input.featured;
      }
      if (input.specs !== undefined) {
        product.specs = [...input.specs];
      }
      if (input.dealNote !== undefined) {
        product.dealNote = input.dealNote;
      }

      return clone(product);
    },
    async deleteProduct(productId: string) {
      const index = state.products.findIndex((entry) => entry.id === productId);
      if (index === -1) return false;

      state.products.splice(index, 1);
      state.inventoryLevels = state.inventoryLevels.filter((level) => level.productId !== productId);
      return true;
    },
    async listPromotions(filters?: PromotionFilters) {
      const status = filters?.status?.trim();
      const data = status
        ? state.promotions.filter((promotion) => promotion.status === status)
        : state.promotions;
      return clone(data);
    },
    async getPromotionById(promotionId: string) {
      return clone(state.promotions.find((promotion) => promotion.id === promotionId));
    },
    async createPromotion(input: CreatePromotionInput) {
      if (state.promotions.some((promotion) => promotion.code && input.code && promotion.code === input.code)) {
        throw new Error("Promotion code already exists");
      }

      const promotion = {
        id: createPromotionId(),
        name: input.name,
        description: input.description,
        code: input.code,
        type: input.type,
        status: input.status,
        discountSummary: input.discountSummary,
        appliesTo: input.appliesTo,
        validThrough: input.validThrough,
      };

      state.promotions.unshift(promotion);
      return clone(promotion);
    },
    async updatePromotion(promotionId: string, input: UpdatePromotionInput) {
      const promotion = state.promotions.find((entry) => entry.id === promotionId);
      if (!promotion) return undefined;

      if (input.name !== undefined) {
        promotion.name = input.name;
      }
      if (input.description !== undefined) {
        promotion.description = input.description;
      }
      if (input.code !== undefined) {
        promotion.code = input.code;
      }
      if (input.type !== undefined) {
        promotion.type = input.type;
      }
      if (input.status !== undefined) {
        promotion.status = input.status;
      }
      if (input.discountSummary !== undefined) {
        promotion.discountSummary = input.discountSummary;
      }
      if (input.appliesTo !== undefined) {
        promotion.appliesTo = input.appliesTo;
      }
      if (input.validThrough !== undefined) {
        promotion.validThrough = input.validThrough;
      }

      return clone(promotion);
    },
    async deletePromotion(promotionId: string) {
      const index = state.promotions.findIndex((entry) => entry.id === promotionId);
      if (index === -1) return false;

      state.promotions.splice(index, 1);
      return true;
    },
    async listOrders(filters?: OrderFilters) {
      const status = filters?.status;
      const data = status?.length
        ? state.orders.filter((order) => status.includes(order.status))
        : state.orders;
      return clone(data);
    },
    async getOrderById(orderId: string) {
      return clone(state.orders.find((order) => order.id === orderId));
    },
    async createOrder(input: CreateOrderInput) {
      const now = new Date().toISOString();
      const order = {
        id: `order_${Date.now()}`,
        orderNumber: `TX-${String(Date.now()).slice(-4)}`,
        customerName: input.customerName,
        status: input.status ?? "pending_payment",
        paymentStatus: input.paymentStatus ?? "pending",
        createdAt: now,
        total: input.total,
        shippingTotal: input.shippingTotal,
        itemCount: input.items.length,
        fulfillmentPartnerName: input.fulfillmentPartnerName,
        destination: input.destination,
        shippingAddress: input.shippingAddress ? clone(input.shippingAddress) : undefined,
        items: clone(input.items),
        notes: input.notes,
      };

      state.orders.unshift(order);
      return clone(order);
    },
    async updateOrder(orderId: string, input: UpdateOrderInput) {
      const order = state.orders.find((entry) => entry.id === orderId);
      if (!order) return undefined;
      if (input.customerName !== undefined) {
        order.customerName = input.customerName;
      }
      Object.assign(order, input);
      return clone(order);
    },
    async listShipments(filters?: ShipmentFilters) {
      const status = filters?.status;
      const data = status?.length
        ? state.shipments.filter((shipment) => status.includes(shipment.status))
        : state.shipments;
      return clone(data);
    },
    async getShipmentById(shipmentId: string) {
      return clone(state.shipments.find((shipment) => shipment.id === shipmentId));
    },
    async getShipmentByTrackingNumber(trackingNumber: string) {
      const lookup = trackingNumber.trim().toUpperCase();
      return clone(
        state.shipments.find((shipment) => shipment.trackingNumber.toUpperCase() === lookup)
      );
    },
    async getShipmentByOrderId(orderId: string) {
      return clone(state.shipments.find((shipment) => shipment.orderId === orderId));
    },
    async createShipment(input: CreateShipmentInput) {
      const shipment = {
        id: createShipmentId(),
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        fulfillmentRequestId: input.fulfillmentRequestId,
        trackingNumber: input.trackingNumber,
        carrier: input.carrier,
        serviceLevel: input.serviceLevel,
        status: input.status ?? "pending",
        partnerName: input.partnerName,
        destination: input.destination,
        shippedAt: input.shippedAt,
        deliveredAt: input.deliveredAt,
        estimatedDeliveryAt: input.estimatedDeliveryAt,
        events: [],
      };

      state.shipments.unshift(shipment);
      return clone(shipment);
    },
    async appendShipmentEvent(shipmentId: string, input: AppendShipmentEventInput) {
      const shipment = state.shipments.find((entry) => entry.id === shipmentId);
      if (!shipment) return undefined;

      const event = {
        id: `event_${Date.now()}`,
        eventStatus: input.eventStatus,
        message: input.message,
        eventAt: input.eventAt ?? new Date().toISOString(),
        source: input.source,
      };

      shipment.events.push(event);
      shipment.status = normalizeShipmentStatus(input.eventStatus) ?? shipment.status;
      if (input.eventStatus === "delivered") {
        shipment.deliveredAt = event.eventAt;
      }
      if (input.eventStatus === "shipped" || input.eventStatus === "in_transit") {
        shipment.shippedAt = shipment.shippedAt ?? event.eventAt;
      }

      return clone(event);
    },
    async listInventoryLocations() {
      return clone(state.inventoryLocations);
    },
    async listInventoryLevels() {
      return clone(state.inventoryLevels);
    },
    async listFulfillmentPartners() {
      return clone(state.fulfillmentPartners);
    },
    async listFulfillmentRequests() {
      return clone(state.fulfillmentRequests);
    },
    async createFulfillmentRequest(input: CreateFulfillmentRequestInput) {
      const request = {
        id: createFulfillmentRequestId(),
        orderId: input.orderId,
        orderNumber: input.orderNumber,
        fulfillmentPartnerId: input.fulfillmentPartnerId,
        fulfillmentPartnerName: input.fulfillmentPartnerName,
        inventoryLocationId: input.inventoryLocationId,
        inventoryLocationName: input.inventoryLocationName,
        status: normalizeRequestStatus(input.status),
        partnerReference: input.partnerReference,
        requestPayload: clone(input.requestPayload) ?? {},
        responsePayload: input.responsePayload ? clone(input.responsePayload) : undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      state.fulfillmentRequests.unshift(request);
      return clone(request);
    },
  };
}
