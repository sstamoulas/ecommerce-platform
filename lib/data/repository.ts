import type {
  Category,
  FulfillmentPartner,
  FulfillmentRequest,
  FulfillmentRequestStatus,
  InventoryLevel,
  InventoryLocation,
  Order,
  OrderItem,
  OrderStatus,
  PaymentStatus,
  Product,
  ProductTone,
  ProductStatus,
  PromotionType,
  Promotion,
  PromotionStatus,
  ShippingAddress,
  UnitType,
  Shipment,
  ShipmentEvent,
  ShipmentEventSource,
  ShipmentStatus,
} from "@/lib/types";

export type DataBackend = "mock" | "firestore" | "postgres";

export type ProductFilters = {
  query?: string;
  category?: string;
  status?: ProductStatus;
  featured?: boolean;
};

export type PromotionFilters = {
  status?: PromotionStatus;
};

export type OrderFilters = {
  status?: OrderStatus[];
};

export type ShipmentFilters = {
  status?: ShipmentStatus[];
};

export type CreateOrderInput = {
  customerName: string;
  total: number;
  shippingTotal: number;
  fulfillmentPartnerName: string;
  destination: string;
  shippingAddress?: ShippingAddress;
  items: OrderItem[];
  status?: OrderStatus;
  paymentStatus?: PaymentStatus;
  notes?: string;
};

export type UpdateOrderInput = Partial<
  Pick<
    Order,
    | "customerName"
    | "status"
    | "paymentStatus"
    | "fulfillmentPartnerName"
    | "destination"
    | "shippingAddress"
    | "notes"
    | "total"
    | "shippingTotal"
  >
>;

export type CreateShipmentInput = {
  orderId: string;
  orderNumber: string;
  fulfillmentRequestId?: string;
  trackingNumber: string;
  carrier: string;
  serviceLevel: string;
  status?: ShipmentStatus;
  partnerName: string;
  destination: string;
  shippedAt?: string;
  deliveredAt?: string;
  estimatedDeliveryAt?: string;
};

export type CreateProductInput = {
  slug: string;
  name: string;
  description: string;
  categorySlug: string;
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

export type UpdateProductInput = Partial<CreateProductInput>;

export type CreatePromotionInput = {
  name: string;
  description: string;
  code?: string;
  type: PromotionType;
  status: PromotionStatus;
  discountSummary: string;
  appliesTo: string;
  validThrough: string;
};

export type UpdatePromotionInput = Partial<CreatePromotionInput>;

export type AppendShipmentEventInput = {
  eventStatus: string;
  message: string;
  source: ShipmentEventSource;
  eventAt?: string;
};

export type CreateFulfillmentRequestInput = {
  orderId: string;
  orderNumber: string;
  fulfillmentPartnerId: string;
  fulfillmentPartnerName: string;
  inventoryLocationId?: string;
  inventoryLocationName?: string;
  status?: FulfillmentRequestStatus;
  partnerReference?: string;
  requestPayload: Record<string, unknown>;
  responsePayload?: Record<string, unknown>;
};

export interface EcommerceRepository {
  backend: DataBackend;
  listCategories(): Promise<Category[]>;
  listProducts(filters?: ProductFilters): Promise<Product[]>;
  getProductBySlug(slug: string): Promise<Product | undefined>;
  getProductById(productId: string): Promise<Product | undefined>;
  createProduct(input: CreateProductInput): Promise<Product>;
  updateProduct(productId: string, input: UpdateProductInput): Promise<Product | undefined>;
  deleteProduct(productId: string): Promise<boolean>;
  listPromotions(filters?: PromotionFilters): Promise<Promotion[]>;
  getPromotionById(promotionId: string): Promise<Promotion | undefined>;
  createPromotion(input: CreatePromotionInput): Promise<Promotion>;
  updatePromotion(promotionId: string, input: UpdatePromotionInput): Promise<Promotion | undefined>;
  deletePromotion(promotionId: string): Promise<boolean>;
  listOrders(filters?: OrderFilters): Promise<Order[]>;
  getOrderById(orderId: string): Promise<Order | undefined>;
  createOrder(input: CreateOrderInput): Promise<Order>;
  updateOrder(orderId: string, input: UpdateOrderInput): Promise<Order | undefined>;
  listShipments(filters?: ShipmentFilters): Promise<Shipment[]>;
  getShipmentById(shipmentId: string): Promise<Shipment | undefined>;
  getShipmentByTrackingNumber(trackingNumber: string): Promise<Shipment | undefined>;
  getShipmentByOrderId(orderId: string): Promise<Shipment | undefined>;
  createShipment(input: CreateShipmentInput): Promise<Shipment>;
  appendShipmentEvent(shipmentId: string, input: AppendShipmentEventInput): Promise<ShipmentEvent | undefined>;
  listInventoryLocations(): Promise<InventoryLocation[]>;
  listInventoryLevels(): Promise<InventoryLevel[]>;
  listFulfillmentPartners(): Promise<FulfillmentPartner[]>;
  listFulfillmentRequests(): Promise<FulfillmentRequest[]>;
  createFulfillmentRequest(input: CreateFulfillmentRequestInput): Promise<FulfillmentRequest>;
}
