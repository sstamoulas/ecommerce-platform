# Textile Ecommerce Platform Schema and API

## Overview
Recommended baseline:
- Database: PostgreSQL
- API style: versioned REST (`/api/v1`)
- IDs: UUID primary keys
- Timestamps: `created_at`, `updated_at` on every table
- Soft delete: `archived_at` or `deleted_at` where business history matters
- Flexible fields: JSONB for partner metadata and textile-specific attributes that vary by product line

The schema should support:
- Textile catalog management
- Deals and promotions
- Orders and payments
- Inventory by location
- Fulfillment routing to local 3PLs
- Shipment tracking and event history
- Admin visibility and auditability

## Core Modeling Principles
- Keep catalog, inventory, orders, and fulfillment separate.
- Preserve event history instead of overwriting states.
- Allow split shipments and partial fulfillment.
- Store partner-specific integration data outside the core order model.
- Support textile-specific selling units such as yard, meter, roll, bolt, and sample.

## Entity Map
- `users` own authentication and roles.
- `customer_profiles` store shopper-specific details.
- `admin_profiles` store back-office user details if needed.
- `categories` organize products.
- `products` hold the catalog listing.
- `product_variants` hold sellable SKUs.
- `product_assets` hold images, swatches, PDFs, and spec sheets.
- `promotions` and `coupon_codes` drive discounts.
- `orders` and `order_items` capture checkout.
- `payments` and `refunds` track money movement.
- `inventory_locations`, `inventory_levels`, `inventory_reservations`, and `inventory_movements` manage stock.
- `fulfillment_partners`, `fulfillment_rules`, and `fulfillment_requests` manage 3PL routing.
- `shipments` and `shipment_events` track delivery progress.
- `audit_logs` record admin changes.

## Suggested Tables

### Identity and Access
#### `users`
Authentication and shared account identity.
- `id`
- `email`
- `password_hash` or external auth reference
- `status` (`active`, `disabled`, `invited`)
- `last_login_at`

#### `roles`
Examples: `admin`, `ops`, `support`, `customer`.

#### `user_roles`
Many-to-many join table between users and roles.

#### `customer_profiles`
Customer-facing profile data.
- `user_id`
- `first_name`
- `last_name`
- `phone`
- `default_shipping_address_id`

#### `admin_profiles`
Optional back-office profile data.
- `user_id`
- `job_title`
- `notes`

### Catalog
#### `categories`
- `id`
- `parent_id`
- `name`
- `slug`
- `sort_order`
- `is_active`

#### `products`
Canonical product record.
- `id`
- `category_id`
- `name`
- `slug`
- `description`
- `brand`
- `status` (`draft`, `active`, `archived`)
- `shipbob_reference_id` external fulfillment SKU/reference, unique when set
- `textile_type` `material` `weave` `pattern` `finish`
- `care_instructions`
- `search_keywords`
- `metadata` JSONB

#### `product_variants`
Sellable SKU-level records.
- `id`
- `product_id`
- `sku`
- `barcode`
- `color`
- `width`
- `length`
- `unit_type` (`yard`, `meter`, `roll`, `bolt`, `piece`, `sample`)
- `unit_increment`
- `minimum_order_qty`
- `maximum_order_qty`
- `price`
- `compare_at_price`
- `cost`
- `weight`
- `is_cut_to_order`
- `is_active`
- `metadata` JSONB

#### `product_assets`
Product media and documentation.
- `id`
- `product_id`
- `variant_id` nullable
- `asset_type` (`image`, `swatch`, `spec_sheet`, `video`)
- `url`
- `alt_text`
- `sort_order`

#### `product_attribute_values`
Optional flexible attributes when a textile line needs more structured options.
- `id`
- `product_id`
- `attribute_name`
- `attribute_value`

### Promotions
#### `promotions`
Promotion configuration.
- `id`
- `name`
- `description`
- `type` (`percent`, `fixed_amount`, `bundle`, `bogo`, `free_shipping`)
- `status` (`draft`, `active`, `scheduled`, `ended`)
- `starts_at`
- `ends_at`
- `min_subtotal`
- `metadata` JSONB

#### `promotion_targets`
What a promotion applies to.
- `promotion_id`
- `target_type` (`product`, `category`, `collection`, `cart`)
- `target_id`

#### `coupon_codes`
- `id`
- `promotion_id`
- `code`
- `usage_limit`
- `uses_per_customer`
- `is_active`

#### `coupon_redemptions`
- `id`
- `coupon_code_id`
- `order_id`
- `redeemed_by_user_id`

### Orders and Payments
#### `orders`
- `id`
- `order_number`
- `user_id`
- `status` (`draft`, `pending_payment`, `paid`, `allocated`, `partially_fulfilled`, `fulfilled`, `shipped`, `delivered`, `canceled`, `refunded`, `exception`)
- `subtotal`
- `discount_total`
- `shipping_total`
- `tax_total`
- `grand_total`
- `currency`
- `billing_address_id`
- `shipping_address` JSONB full recipient snapshot
- `notes`
- `source` (`storefront`, `admin`, `api`)

#### `order_items`
- `id`
- `order_id`
- `product_id`
- `variant_id`
- `sku`
- `product_name`
- `variant_name`
- `quantity`
- `unit_price`
- `shipbob_reference_id` snapshot for fulfillment
- `discount_total`
- `tax_total`
- `fulfillment_status`

#### `order_status_history`
Append-only status changes.
- `id`
- `order_id`
- `from_status`
- `to_status`
- `changed_by_user_id`
- `reason`

#### `payments`
- `id`
- `order_id`
- `provider`
- `provider_payment_id`
- `status` (`authorized`, `captured`, `failed`, `voided`, `refunded`, `partially_refunded`)
- `amount`
- `currency`
- `metadata` JSONB

#### `refunds`
- `id`
- `payment_id`
- `order_id`
- `amount`
- `reason`
- `status`

#### `addresses`
Reusable customer or order addresses.
- `id`
- `name`
- `line1`
- `line2`
- `city`
- `state`
- `postal_code`
- `country`
- `phone`

### Inventory
#### `inventory_locations`
Physical stock locations.
- `id`
- `name`
- `type` (`warehouse`, `3pl`, `store`, `in_transit`)
- `partner_id` nullable
- `address_id` nullable
- `is_active`

#### `inventory_levels`
Current stock by location and variant.
- `id`
- `inventory_location_id`
- `product_variant_id`
- `on_hand_qty`
- `reserved_qty`
- `available_qty`
- `safety_stock_qty`

#### `inventory_reservations`
Temporary holds for checkout and allocation.
- `id`
- `order_id`
- `order_item_id`
- `inventory_location_id`
- `product_variant_id`
- `quantity`
- `expires_at`
- `status` (`active`, `released`, `consumed`)

#### `inventory_movements`
Audit trail for every stock change.
- `id`
- `inventory_location_id`
- `product_variant_id`
- `movement_type` (`receive`, `reserve`, `release`, `ship`, `adjust`, `return`)
- `quantity_delta`
- `reference_type`
- `reference_id`
- `notes`

### Fulfillment and 3PL
#### `fulfillment_partners`
Local or remote logistics partners.
- `id`
- `name`
- `integration_type` (`api`, `sftp`, `csv`, `email`, `manual`)
- `status` (`active`, `paused`, `disabled`)
- `service_regions` JSONB
- `metadata` JSONB

#### `fulfillment_partner_credentials`
Secure partner connection settings.
- `id`
- `fulfillment_partner_id`
- `credential_type`
- `encrypted_payload`
- `last_verified_at`

#### `fulfillment_rules`
How orders route to a partner or location.
- `id`
- `name`
- `priority`
- `conditions` JSONB
- `action` JSONB
- `is_active`

#### `fulfillment_requests`
What the platform sends to a partner.
- `id`
- `order_id`
- `order_number`
- `inventory_location_id`
- `fulfillment_partner_id`
- `fulfillment_partner_name`
- `inventory_location_name`
- `status` (`queued`, `sent`, `accepted`, `rejected`, `fulfilled`, `failed`)
- `partner_reference`
- `request_payload` JSONB
- `response_payload` JSONB
- `created_at`
- `updated_at`

### Shipments
#### `shipments`
Physical parcel or freight shipment.
- `id`
- `order_id`
- `fulfillment_request_id`
- `carrier`
- `service_level`
- `tracking_number`
- `status` (`pending`, `label_created`, `packed`, `shipped`, `in_transit`, `out_for_delivery`, `delivered`, `exception`, `returned`)
- `shipped_at`
- `delivered_at`
- `estimated_delivery_at`

#### `shipment_items`
Mapping between shipments and order items.
- `id`
- `shipment_id`
- `order_item_id`
- `quantity`

#### `shipment_events`
Append-only tracking history.
- `id`
- `shipment_id`
- `event_type`
- `event_status`
- `event_message`
- `event_at`
- `source`

#### `tracking_webhook_logs`
Store raw inbound carrier or 3PL tracking payloads for debugging.
- `id`
- `shipment_id`
- `source`
- `payload` JSONB
- `received_at`
- `processed_at`
- `processing_status`

### Admin and Audit
#### `audit_logs`
- `id`
- `actor_user_id`
- `action`
- `entity_type`
- `entity_id`
- `before_state` JSONB
- `after_state` JSONB
- `created_at`

## Key Relationships
- `categories` can nest through `parent_id`.
- `products` belong to one category but can be extended later if needed.
- `products` have many `product_variants`.
- `orders` have many `order_items`.
- `orders` can have many `shipments`.
- `shipments` can include many `order_items` through `shipment_items`.
- `inventory_locations` have many `inventory_levels`.
- `inventory_levels` are keyed by `inventory_location_id` and `product_variant_id`.
- `fulfillment_requests` usually create or update one or more `shipments`.
- `shipment_events` preserve the shipment timeline.

## Important Indexes
- `products.slug` unique
- `product_variants.sku` unique
- `orders.order_number` unique
- `coupon_codes.code` unique
- `inventory_levels` unique on `(inventory_location_id, product_variant_id)`
- `inventory_reservations` on `(order_id, product_variant_id, status)`
- `shipments.tracking_number` indexed
- `shipment_events` on `(shipment_id, event_at)`
- `order_status_history` on `(order_id, changed_at)`

## State Models
### Order Status
Recommended progression:
- `draft`
- `pending_payment`
- `paid`
- `allocated`
- `partially_fulfilled`
- `fulfilled`
- `shipped`
- `delivered`
- `canceled`
- `refunded`
- `exception`

### Shipment Status
Recommended progression:
- `pending`
- `label_created`
- `packed`
- `shipped`
- `in_transit`
- `out_for_delivery`
- `delivered`
- `exception`
- `returned`

### Fulfillment Request Status
- `queued`
- `sent`
- `accepted`
- `rejected`
- `fulfilled`
- `failed`

## API Design
Base path: `/api/v1`

### Authentication
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /me`

Use cookie sessions or JWTs for customer traffic. Admin endpoints should require RBAC checks.

### Public Catalog
- `GET /catalog/categories`
- `GET /catalog/products`
- `GET /catalog/products/{slug}`
- `GET /catalog/products/{slug}/variants`
- `GET /promotions/active`
- `GET /search?q=...`

### Cart and Checkout
- `POST /cart/items`
- `PATCH /cart/items/{id}`
- `DELETE /cart/items/{id}`
- `GET /cart`
- `POST /checkout/preview`
- `POST /checkout/submit`

Checkout submissions should carry a structured `shippingAddress`, and each submitted line item should snapshot the product's `shipbobReferenceId` so fulfillment dispatch stays deterministic.

### Customer Orders
- `GET /me/orders`
- `GET /me/orders/{orderId}`
- `GET /me/orders/{orderId}/shipments`
- `GET /me/shipments/{shipmentId}`

### Admin Catalog
- `GET /admin/products`
- `POST /admin/products`
- `PATCH /admin/products/{id}`
- `POST /admin/products/{id}/archive`
- `POST /admin/products/{id}/variants`
- `PATCH /admin/variants/{id}`
- `POST /admin/categories`

### Admin Promotions
- `GET /admin/promotions`
- `POST /admin/promotions`
- `PATCH /admin/promotions/{id}`
- `POST /admin/coupons`
- `PATCH /admin/coupons/{id}`

### Admin Orders
- `GET /admin/orders`
- `GET /admin/orders/{id}`
- `PATCH /admin/orders/{id}`
- `POST /admin/orders/{id}/cancel`
- `POST /admin/orders/{id}/refund`
- `POST /admin/orders/{id}/allocate`

### Admin Inventory
- `GET /admin/inventory/levels`
- `PATCH /admin/inventory/levels/{id}`
- `POST /admin/inventory/adjustments`
- `GET /admin/inventory/movements`

### Admin Fulfillment and Shipments
- `GET /admin/fulfillment-partners`
- `POST /admin/fulfillment-partners`
- `PATCH /admin/fulfillment-partners/{id}`
- `GET /admin/fulfillment-rules`
- `POST /admin/fulfillment-rules`
- `POST /admin/fulfillment/dispatch`
- `GET /admin/shipments`
- `GET /admin/shipments/{id}`
- `PATCH /admin/shipments/{id}`
- `POST /admin/shipments/{id}/events`

### Partner and Webhook Endpoints
- `POST /webhooks/fulfillment/{partnerKey}`
- `POST /webhooks/carriers/{carrierKey}`
- `POST /webhooks/payments/{providerKey}`

## API Response Shape
Keep responses predictable:
- `data` for the primary payload
- `meta` for pagination and counts
- `errors` for validation or business-rule failures

Example:
```json
{
  "data": {
    "id": "uuid",
    "status": "shipped"
  },
  "meta": {
    "request_id": "..."
  }
}
```

## Validation Rules
- Quantity must respect `minimum_order_qty` and `unit_increment`.
- Promotions must not reduce order totals below zero.
- Orders cannot be sent to fulfillment without a payable status.
- Inventory reservations must expire or be consumed.
- Tracking numbers should be unique per carrier when possible.

## Suggested Implementation Sequence
1. Build catalog and product variant tables.
2. Add promotions and coupon support.
3. Implement orders and payment records.
4. Add inventory levels and reservations.
5. Wire fulfillment partner records and rules.
6. Add shipments and tracking events.
7. Add admin endpoints and audit logs.

## Recommended Next Step
Use this schema/API spec to scaffold the application structure and implement the first tables and endpoints.
