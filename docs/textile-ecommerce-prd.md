# Textile Ecommerce Platform PRD

## Summary
Build an ecommerce platform for textile products that supports customer shopping, special deals, admin operations, fulfillment routing, and shipment tracking. The system should work for retail and wholesale-style textile sales, with room to connect to one or more local 3PL partners.

## Product Vision
Create a focused ecommerce system for selling textile inventory online while giving the business full control over products, promotions, orders, shipping, and fulfillment exceptions.

## Goals
- List and sell textile products online.
- Support promotions, bundles, and limited-time deals.
- Give admins a single view of products, orders, shipments, inventory, and customers.
- Connect orders to local 3PL partners for fulfillment.
- Track shipments from fulfillment through delivery.
- Give customers a clear order and shipment status experience.

## Non-Goals For MVP
- Marketplace support for multiple independent sellers.
- Advanced ERP replacement.
- Complex manufacturing planning.
- Full accounting or payroll.
- International expansion and multi-currency support, unless required later.

## Assumptions
- The business will start with a small number of textile product categories.
- At least one local 3PL will be able to receive orders via API, CSV, email, or portal entry.
- Payments will be handled by a standard third-party processor.
- Shipping labels and tracking numbers can come from the 3PL or a carrier integration.

## Primary Users
### Customer
Browses textiles, applies deals, places orders, and tracks shipments.

### Admin
Manages product data, pricing, promotions, inventory, shipments, and 3PL coordination.

### Fulfillment Partner
Receives fulfillment requests, ships orders, and provides shipment updates.

## Core User Journeys
### Browse and Buy
1. Customer searches or filters textile products.
2. Customer reviews product details, variants, and available deals.
3. Customer adds items to cart and checks out.
4. Order is created and payment is authorized or captured.

### Fulfill and Ship
1. Order enters admin fulfillment queue.
2. System assigns a fulfillment destination or 3PL based on rules.
3. Fulfillment request is sent to the 3PL.
4. Shipment and tracking details are recorded.
5. Tracking events update the customer order timeline.

### Admin Operations
1. Admin views orders needing attention.
2. Admin updates inventory, deal rules, or fulfillment instructions.
3. Admin resolves exceptions such as stock issues, address problems, or delayed shipments.

## Textile-Specific Requirements
- Support textile attributes such as material, weave, pattern, width, weight, color, and finish.
- Support selling by unit type such as yard, meter, roll, bolt, piece, or sample.
- Support cut-to-order quantities and minimum order quantities.
- Track variant-level stock by color, width, or batch if needed.
- Allow product photos, swatches, and spec sheets.
- Support wholesale pricing tiers if needed.

## Functional Requirements
### Storefront
- Product listing pages with categories and filters.
- Search by product name, material, color, width, and other textile attributes.
- Product detail pages with variant selection.
- Deal badges and promotional pricing.
- Cart and checkout flow.
- Customer account area for order history and shipment tracking.

### Deals and Promotions
- Percentage discounts, fixed discounts, and coupon codes.
- Flash sales with start and end times.
- Category-level promotions.
- Bundle or volume-based pricing if needed.
- Promo eligibility rules, such as minimum spend or specific products.

### Orders
- Order creation with payment status.
- Order state tracking from new to fulfilled, shipped, delivered, canceled, or refunded.
- Partial fulfillment support if inventory is split across locations.
- Admin notes and exception handling.

### Inventory
- Track available, reserved, and committed inventory.
- Support inventory by warehouse or 3PL location.
- Record inventory adjustments and stock changes.
- Flag low stock or out-of-stock items.

### Fulfillment and 3PL
- Configure one or more local 3PL partners.
- Send fulfillment requests automatically when an order is paid.
- Support manual review before fulfillment when needed.
- Store shipment tracking number, carrier, and service level.
- Receive shipment status updates from webhook, polling, upload, or manual entry.

### Shipping Tracking
- Show shipment status to customers.
- Display milestones such as label created, in transit, out for delivery, and delivered.
- Show shipment history for admins.
- Support multiple shipments per order if the order is split.

### Admin Dashboard
- Product management.
- Order management.
- Shipment management.
- Inventory management.
- Promotion management.
- 3PL configuration.
- Reporting and export views.

### Notifications
- Email notifications for order confirmation, shipment, delivery, and exceptions.
- Optional SMS notifications in a later phase.

## Data Objects
- Product
- Product Variant
- Category
- Promotion
- Coupon
- Customer
- Order
- Order Item
- Shipment
- Shipment Event
- Inventory Location
- Inventory Movement
- 3PL Partner
- Fulfillment Rule

## Business Rules
- Only active products can be purchased.
- Discounts must not create negative totals.
- Orders must not be sent to fulfillment if payment has failed or is pending review.
- Inventory reservations should prevent overselling where possible.
- Shipment status must always preserve history, not only the latest state.

## Success Metrics
- Conversion rate from product view to completed order.
- Percentage of orders fulfilled on time.
- Shipment tracking completeness.
- Reduction in manual fulfillment work.
- Low stock alert response time.
- Promo usage and revenue lift during campaigns.

## MVP Scope
### Must Have
- Product catalog for textile items.
- Promo and deal support.
- Cart and checkout.
- Customer account with order tracking.
- Admin order, product, and inventory management.
- Basic 3PL integration.
- Shipment tracking visibility.

### Should Have
- Manual fulfillment override.
- Shipment event timeline.
- Basic reporting dashboard.
- Email notifications.

### Could Have
- Wholesale pricing tiers.
- Returns workflow.
- SMS notifications.
- Carrier rate shopping.

## Phase 2 Enhancements
- Multiple 3PL routing by region or inventory location.
- Returns and exchange portal.
- Customer support tooling.
- Advanced analytics and forecasting.
- B2B account roles and negotiated pricing.
- Automated label creation if the 3PL does not handle labels.

## Risks
- 3PL integration quality may vary by partner.
- Textile inventory units can be inconsistent unless definitions are strict.
- Split shipments can complicate tracking and customer support.
- Cut-to-order workflows may require special fulfillment rules.

## Open Questions
- Which local 3PLs should be supported first?
- Will the business sell only direct-to-consumer, or also wholesale?
- Do you need cut-to-order fulfillment on day one?
- Should inventory be managed by yard, roll, or both?
- Which payment provider and shipping carriers will be used?

## Recommended Next Step
Define the data model and API around products, deals, orders, inventory, fulfillment, shipments, and 3PL connections.
