CREATE TABLE IF NOT EXISTS categories (
  id text PRIMARY KEY,
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  description text NOT NULL,
  is_featured boolean NOT NULL DEFAULT false
);

CREATE TABLE IF NOT EXISTS products (
  id text PRIMARY KEY,
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  description text NOT NULL,
  category_slug text NOT NULL REFERENCES categories(slug) ON UPDATE CASCADE ON DELETE RESTRICT,
  category_name text NOT NULL,
  material text NOT NULL,
  weave text NOT NULL,
  color text NOT NULL,
  width text NOT NULL,
  unit_type text NOT NULL,
  unit_increment integer NOT NULL,
  price_cents integer NOT NULL,
  compare_at_price_cents integer,
  stock_qty integer NOT NULL,
  minimum_order_qty integer NOT NULL,
  badge text NOT NULL,
  shipbob_reference_id text UNIQUE,
  visual_tone text NOT NULL,
  status text NOT NULL,
  featured boolean NOT NULL DEFAULT false,
  specs text[] NOT NULL DEFAULT '{}'::text[],
  deal_note text
);

CREATE TABLE IF NOT EXISTS promotions (
  id text PRIMARY KEY,
  name text NOT NULL,
  description text NOT NULL,
  code text,
  type text NOT NULL,
  status text NOT NULL,
  discount_summary text NOT NULL,
  applies_to text NOT NULL,
  valid_through text NOT NULL
);

CREATE TABLE IF NOT EXISTS inventory_locations (
  id text PRIMARY KEY,
  name text NOT NULL,
  type text NOT NULL,
  region text NOT NULL,
  contact text NOT NULL
);

CREATE TABLE IF NOT EXISTS fulfillment_partners (
  id text PRIMARY KEY,
  name text NOT NULL,
  integration_type text NOT NULL,
  status text NOT NULL,
  region text NOT NULL,
  turnaround text NOT NULL,
  contact text NOT NULL
);

CREATE TABLE IF NOT EXISTS fulfillment_requests (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  order_number text NOT NULL,
  fulfillment_partner_id text NOT NULL REFERENCES fulfillment_partners(id) ON DELETE RESTRICT,
  fulfillment_partner_name text NOT NULL,
  inventory_location_id text REFERENCES inventory_locations(id) ON DELETE SET NULL,
  inventory_location_name text,
  status text NOT NULL,
  partner_reference text,
  request_payload jsonb NOT NULL,
  response_payload jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS inventory_levels (
  id text PRIMARY KEY,
  inventory_location_id text NOT NULL REFERENCES inventory_locations(id) ON DELETE CASCADE,
  inventory_location_name text NOT NULL,
  product_id text NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  product_name text NOT NULL,
  variant_name text NOT NULL,
  on_hand_qty integer NOT NULL,
  reserved_qty integer NOT NULL,
  available_qty integer NOT NULL,
  low_stock_threshold integer NOT NULL,
  UNIQUE (inventory_location_id, product_id, variant_name)
);

CREATE TABLE IF NOT EXISTS orders (
  id text PRIMARY KEY,
  order_number text NOT NULL UNIQUE,
  customer_name text NOT NULL,
  status text NOT NULL,
  payment_status text NOT NULL,
  created_at timestamptz NOT NULL,
  total_cents integer NOT NULL,
  shipping_total_cents integer NOT NULL,
  item_count integer NOT NULL,
  fulfillment_partner_name text NOT NULL,
  destination text NOT NULL,
  shipping_address jsonb,
  notes text,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS order_items (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  position integer NOT NULL,
  product_name text NOT NULL,
  variant_name text NOT NULL,
  quantity integer NOT NULL,
  unit_price_cents integer NOT NULL,
  line_total_cents integer NOT NULL,
  shipbob_reference_id text,
  fulfillment_status text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipments (
  id text PRIMARY KEY,
  order_id text NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  fulfillment_request_id text REFERENCES fulfillment_requests(id) ON DELETE SET NULL,
  order_number text NOT NULL,
  tracking_number text NOT NULL UNIQUE,
  carrier text NOT NULL,
  service_level text NOT NULL,
  status text NOT NULL,
  partner_name text NOT NULL,
  destination text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  shipped_at timestamptz,
  delivered_at timestamptz,
  estimated_delivery_at timestamptz,
  last_event_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS shipment_events (
  id text PRIMARY KEY,
  shipment_id text NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  event_status text NOT NULL,
  message text NOT NULL,
  event_at timestamptz NOT NULL,
  source text NOT NULL
);

CREATE INDEX IF NOT EXISTS products_category_slug_idx ON products (category_slug);
CREATE INDEX IF NOT EXISTS products_status_idx ON products (status);
CREATE INDEX IF NOT EXISTS products_featured_idx ON products (featured);
CREATE INDEX IF NOT EXISTS orders_status_idx ON orders (status);
CREATE INDEX IF NOT EXISTS orders_created_at_idx ON orders (created_at DESC);
CREATE INDEX IF NOT EXISTS fulfillment_requests_status_idx ON fulfillment_requests (status);
CREATE INDEX IF NOT EXISTS fulfillment_requests_created_at_idx ON fulfillment_requests (created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS fulfillment_requests_open_order_id_idx
  ON fulfillment_requests (order_id)
  WHERE status IN ('queued', 'sent', 'accepted');
CREATE INDEX IF NOT EXISTS shipments_status_idx ON shipments (status);
CREATE INDEX IF NOT EXISTS shipments_last_event_at_idx ON shipments (last_event_at DESC);
CREATE INDEX IF NOT EXISTS shipment_events_shipment_id_idx ON shipment_events (shipment_id, event_at);
CREATE SEQUENCE IF NOT EXISTS order_number_seq START WITH 1052 INCREMENT BY 1;
