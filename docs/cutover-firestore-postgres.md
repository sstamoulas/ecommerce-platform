# Firestore to Postgres Cutover Architecture

## Goal
Start the app on a low-cost backend when needed, then cut over to Postgres later without changing the UI or business logic.

## Principle
The app should never depend on Firestore or Postgres directly. It should talk to a repository contract:

- UI and API routes call `getRepository()` through the data access layer
- That layer calls a repository interface
- The repository is backed by `mock`, `firestore`, or `postgres`

This keeps the cutover as a backend swap, not an app rewrite.

## Recommended Mode Sequence
### Phase 1: Local development
- `DATA_BACKEND=mock`
- No cloud cost
- Good for UI work and flow testing

### Phase 2: Production MVP
- `DATA_BACKEND=firestore`
- Use Firestore as the temporary source of truth
- Keep document shapes close to the final relational model

### Phase 3: Cutover
- Freeze Firestore writes
- Export and backfill the final dataset
- Verify totals and counts
- Flip `DATA_BACKEND=postgres`

### Phase 4: Post-cutover
- Keep Firestore read-only for rollback for a short window
- Decommission Firestore writers after validation

## Repository Contract
The app should expose methods for:
- Products and categories
- Promotions
- Orders
- Shipments and shipment events
- Inventory locations and levels
- Fulfillment partners

If later you add checkout writes, the same repository should also expose:
- Create order
- Update order
- Append shipment event

The current scaffold already routes the storefront, admin screens, and read API routes through this repository contract. The Postgres adapter is implemented and becomes the default when `DATABASE_URL` is present; Firestore remains optional.

## Data Shape Rules
To keep migration clean:
- Use UUIDs or stable generated IDs in both systems
- Store money as integer cents
- Store dates as UTC ISO strings
- Store shipping addresses as structured JSON so fulfillment partners can receive a complete recipient block
- Store fulfillment references on products and copy them onto order items at checkout time
- Avoid embedding business logic in Firestore document paths
- Keep shipment events and inventory movements append-only where possible
- Keep Firestore documents as flat as practical

## Firestore Phase
During the Firestore phase:
- Use batched writes or transactions for order and inventory consistency
- Do not allow a second live writer in Postgres
- Keep a strict schema document for each collection

Firestore is document-oriented and schemaless, so the repository layer must enforce consistency that the database will not enforce for you.

## Postgres Phase
Postgres becomes the system of record when:
- Checkout and fulfillment have stable flows
- You need stronger reporting and joins
- Inventory, orders, and shipment history need relational integrity

At that point, Firestore is no longer the writer.

## Cutover Process
1. Put the app on the repository contract.
2. Run Firestore in production.
3. Build the Postgres schema to match the repository contract.
4. Run `npm run db:bootstrap` or your equivalent migration pipeline in staging Postgres.
5. Write a migration script that loads Firestore export data into staging Postgres.
6. Run validation checks in staging.
7. Freeze Firestore writes.
8. Apply the final delta export.
9. Switch `DATA_BACKEND=postgres`.
10. Monitor for errors and data mismatches.
11. Keep Firestore available read-only for rollback until confidence is high.

## Migration Script Outline
The migration script should:
- Read Firestore export files or stream Firestore documents
- Flatten nested documents into relational rows
- Load in this order:
  - categories
  - products
  - product variants
  - promotions
  - customers
  - addresses
  - orders
  - order items
  - payments
  - inventory locations
  - inventory levels
  - fulfillment partners
  - shipments
  - shipment events
- Record import checkpoints
- Retry idempotently

For this scaffold, the local Postgres bootstrap lives in:
- [db/postgres/schema.sql](/Users/sstamoulas/Desktop/Projects/ecommerce-platform/db/postgres/schema.sql)
- [db/postgres/seed.sql](/Users/sstamoulas/Desktop/Projects/ecommerce-platform/db/postgres/seed.sql)
- [scripts/bootstrap-postgres.js](/Users/sstamoulas/Desktop/Projects/ecommerce-platform/scripts/bootstrap-postgres.js)

## Verification Checks
Run these before and after cutover:
- Count parity for every entity type
- Order total parity
- Shipment count parity
- Shipment event count parity
- Inventory level parity
- Promotion count parity
- Spot-check 20 to 50 real records
- Recompute revenue and open order totals from both backends
- Confirm tracking numbers resolve to the same shipment

## Rollback Plan
If Postgres is wrong after cutover:
- Flip `DATA_BACKEND` back to Firestore
- Keep the final Firestore snapshot intact
- Re-run the migration after fixing the issue

Rollback only works if Firestore is not being written to after cutover.

## Timeline
If the app is not live yet:
- Repository contract and adapters: 1 to 2 days
- Firestore implementation: 2 to 5 days
- Postgres schema and repository: 3 to 7 days
- Migration script and validation: 2 to 5 days
- Cutover: 1 day

If the app is already live with orders:
- Add 1 to 2 weeks for staging rehearsal and edge cases

## Recommendation
If you have not launched yet, skip the Firestore phase and go straight to Postgres.
If you want the lowest-friction prototype first, use Firestore for a short MVP window, then cut over once your order flow is stable.
