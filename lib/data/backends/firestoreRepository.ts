import type { EcommerceRepository } from "@/lib/data/repository";

function unavailable(method: string): never {
  throw new Error(
    `Firestore backend is not configured yet. The method "${method}" was called before the Firestore adapter was implemented.`
  );
}

export function createFirestoreRepository(): EcommerceRepository {
  return {
    backend: "firestore",
    async listCategories() {
      return unavailable("listCategories");
    },
    async listProducts() {
      return unavailable("listProducts");
    },
    async getProductBySlug() {
      return unavailable("getProductBySlug");
    },
    async getProductById() {
      return unavailable("getProductById");
    },
    async createProduct() {
      return unavailable("createProduct");
    },
    async updateProduct() {
      return unavailable("updateProduct");
    },
    async deleteProduct() {
      return unavailable("deleteProduct");
    },
    async listPromotions() {
      return unavailable("listPromotions");
    },
    async getPromotionById() {
      return unavailable("getPromotionById");
    },
    async createPromotion() {
      return unavailable("createPromotion");
    },
    async updatePromotion() {
      return unavailable("updatePromotion");
    },
    async deletePromotion() {
      return unavailable("deletePromotion");
    },
    async listOrders() {
      return unavailable("listOrders");
    },
    async getOrderById() {
      return unavailable("getOrderById");
    },
    async createOrder() {
      return unavailable("createOrder");
    },
    async updateOrder() {
      return unavailable("updateOrder");
    },
    async listShipments() {
      return unavailable("listShipments");
    },
    async getShipmentById() {
      return unavailable("getShipmentById");
    },
    async getShipmentByTrackingNumber() {
      return unavailable("getShipmentByTrackingNumber");
    },
    async getShipmentByOrderId() {
      return unavailable("getShipmentByOrderId");
    },
    async createShipment() {
      return unavailable("createShipment");
    },
    async appendShipmentEvent() {
      return unavailable("appendShipmentEvent");
    },
    async listInventoryLocations() {
      return unavailable("listInventoryLocations");
    },
    async listInventoryLevels() {
      return unavailable("listInventoryLevels");
    },
    async listFulfillmentPartners() {
      return unavailable("listFulfillmentPartners");
    },
    async listFulfillmentRequests() {
      return unavailable("listFulfillmentRequests");
    },
    async createFulfillmentRequest() {
      return unavailable("createFulfillmentRequest");
    },
  };
}
