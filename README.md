# Threadline

Textile ecommerce scaffold with:
- Storefront pages for textile products and deals
- Admin console for orders, inventory, shipments, fulfillment dispatch, and partner routing
- Shipment tracking pages for consumers
- Versioned REST API routes for catalog, orders, shipments, promotions, and fulfillment webhooks

## Docs
- Product requirements: `docs/textile-ecommerce-prd.md`
- Schema and API: `docs/textile-ecommerce-schema-api.md`
- Firestore to Postgres cutover: `docs/cutover-firestore-postgres.md`

## Stack
- Next.js App Router
- TypeScript
- Backend contract in `lib/data` with mock, Firestore, and Postgres adapters
- Postgres is the default runtime path when `DATABASE_URL` is set

## Backend selection
- Leave `DATA_BACKEND` unset to auto-use Postgres when `DATABASE_URL` is present
- `DATA_BACKEND=mock` uses the local mock repository for offline development
- `DATA_BACKEND=firestore` selects the Firestore adapter stub
- `DATA_BACKEND=postgres` selects the Postgres adapter

## Postgres setup
- Create a free managed Postgres database such as Neon or Supabase
- Set `DATABASE_URL` in your environment
- Set `POSTGRES_SSL=true` for hosted databases that require SSL
- Run `npm run db:bootstrap` once to create the schema and seed the sample textile catalog
- Set `POSTGRES_AUTO_BOOTSTRAP=false` in production to avoid creating schema on first request
- The app still auto-bootstrap checks in non-production unless you disable them
- Set `ADMIN_PASSWORD` and `ADMIN_SESSION_SECRET` to enable the protected admin login
- Set `FULFILLMENT_WEBHOOK_SECRET` if you want shared-secret protection on 3PL webhook calls
- Set `SHIPBOB_WEBHOOK_SECRET` if you wire ShipBob webhooks into the fulfillment endpoint
- ShipBob dispatch needs a full shipping address on the order record and a channel header in the outbound request
- Set `FULFILLMENT_DISPATCH_ENDPOINTS_JSON` to map a fulfillment partner to an outbound POST endpoint, for example `{"partner_shipbob":{"url":"https://api.shipbob.com/2026-01/order","headers":{"authorization":"Bearer replace-me","shipbob_channel_id":"replace-me"}}}`
- Set `FULFILLMENT_DISPATCH_TIMEOUT_MS` to change the partner POST timeout in milliseconds

## Run
```bash
npm install
npm run dev
```

## Main routes
- `/` home
- `/store` catalog
- `/store/[slug]` product detail
- `/track` tracking hub
- `/track/[trackingNumber]` shipment detail
- `/admin` admin dashboard
- `/admin/login` admin sign-in
- `/admin/orders` orders table
- `/admin/orders/[orderId]` order editor
- `/admin/fulfillment` fulfillment dispatch queue
- `/admin/inventory` inventory view
- `/admin/shipments` shipment operations
- `/admin/shipments/[shipmentId]` shipment exception workflow

## API examples
- `/api/v1/products`
- `/api/v1/products/[slug]`
- `/api/v1/orders`
- `/api/v1/orders/[orderId]`
- `/api/v1/shipments`
- `/api/v1/shipments/[shipmentId]`
- `/api/v1/shipments/[shipmentId]/events`
- `/api/v1/promotions`
- `/api/v1/webhooks/fulfillment/[partnerKey]`
- `/api/v1/admin/session`
- `/api/v1/admin/products`
- `/api/v1/admin/promotions`
- `/api/v1/admin/orders/[orderId]`
- `/api/v1/admin/fulfillment/dispatch`
- `/api/v1/admin/shipments/[shipmentId]`
# ecommerce-platform
