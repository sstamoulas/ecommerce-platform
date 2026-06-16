export type ProductStatus = "draft" | "active" | "archived";
export type ProductTone = "indigo" | "sand" | "sage" | "amber" | "ruby";
export type UnitType = "yard" | "meter" | "roll" | "bolt" | "piece" | "sample";
export type PromotionStatus = "draft" | "active" | "scheduled" | "ended";
export type PromotionType = "percent" | "fixed_amount" | "bundle" | "bogo" | "free_shipping";
export type OrderStatus =
  | "draft"
  | "pending_payment"
  | "paid"
  | "allocated"
  | "partially_fulfilled"
  | "fulfilled"
  | "shipped"
  | "delivered"
  | "canceled"
  | "refunded"
  | "exception";
export type PaymentStatus = "pending" | "authorized" | "captured" | "failed" | "refunded";
export type ShipmentStatus =
  | "pending"
  | "label_created"
  | "packed"
  | "shipped"
  | "in_transit"
  | "out_for_delivery"
  | "delivered"
  | "canceled"
  | "exception"
  | "returned";
export type FulfillmentPartnerStatus = "active" | "paused" | "disabled";
export type FulfillmentIntegrationType = "api" | "sftp" | "csv" | "email" | "manual";
export type InventoryLocationType = "warehouse" | "3pl" | "store" | "in_transit";
export type ShipmentEventSource = "3pl" | "carrier" | "admin" | "customer_service" | "system";
export type FulfillmentRequestStatus = "queued" | "sent" | "accepted" | "rejected" | "fulfilled" | "failed";

export type ShippingAddress = {
  address1: string;
  address2?: string;
  companyName?: string;
  city: string;
  state: string;
  country: string;
  zipCode: string;
  email?: string;
  phoneNumber?: string;
};

export type Category = {
  id: string;
  name: string;
  slug: string;
  description: string;
  count: number;
  isFeatured: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
  categoryName: string;
  material: string;
  weave: string;
  color: string;
  width: string;
  unitType: UnitType;
  unitIncrement: number;
  price: number;
  compareAtPrice?: number;
  stockQty: number;
  minimumOrderQty: number;
  badge: string;
  shipbobReferenceId?: string;
  visualTone: ProductTone;
  status: ProductStatus;
  featured: boolean;
  specs: string[];
  dealNote?: string;
};

export type Promotion = {
  id: string;
  name: string;
  description: string;
  code?: string;
  type: PromotionType;
  status: PromotionStatus;
  discountSummary: string;
  appliesTo: string;
  validThrough: string;
};

export type OrderItem = {
  id: string;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  shipbobReferenceId?: string;
  fulfillmentStatus: "pending" | "allocated" | "fulfilled" | "backordered";
};

export type Order = {
  id: string;
  orderNumber: string;
  customerName: string;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  createdAt: string;
  total: number;
  shippingTotal: number;
  itemCount: number;
  fulfillmentPartnerName: string;
  destination: string;
  shippingAddress?: ShippingAddress;
  items: OrderItem[];
  notes?: string;
};

export type ShipmentEvent = {
  id: string;
  eventStatus: string;
  message: string;
  eventAt: string;
  source: ShipmentEventSource;
};

export type Shipment = {
  id: string;
  orderId: string;
  orderNumber: string;
  fulfillmentRequestId?: string;
  trackingNumber: string;
  carrier: string;
  serviceLevel: string;
  status: ShipmentStatus;
  partnerName: string;
  destination: string;
  shippedAt?: string;
  deliveredAt?: string;
  estimatedDeliveryAt?: string;
  events: ShipmentEvent[];
};

export type InventoryLocation = {
  id: string;
  name: string;
  type: InventoryLocationType;
  region: string;
  contact: string;
};

export type InventoryLevel = {
  id: string;
  inventoryLocationId: string;
  inventoryLocationName: string;
  productId: string;
  productName: string;
  variantName: string;
  onHandQty: number;
  reservedQty: number;
  availableQty: number;
  lowStockThreshold: number;
};

export type FulfillmentPartner = {
  id: string;
  name: string;
  integrationType: FulfillmentIntegrationType;
  status: FulfillmentPartnerStatus;
  region: string;
  turnaround: string;
  contact: string;
};

export type FulfillmentRequest = {
  id: string;
  orderId: string;
  orderNumber: string;
  fulfillmentPartnerId: string;
  fulfillmentPartnerName: string;
  inventoryLocationId?: string;
  inventoryLocationName?: string;
  status: FulfillmentRequestStatus;
  partnerReference?: string;
  requestPayload: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};
