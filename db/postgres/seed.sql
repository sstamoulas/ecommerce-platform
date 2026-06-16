INSERT INTO categories (id, name, slug, description, is_featured) VALUES
  ('cat_cotton', 'Cotton', 'cotton', 'Everyday woven and twill cottons for apparel and utility goods.', true),
  ('cat_linen', 'Linen', 'linen', 'Natural linens with a soft hand and a clean drape.', true),
  ('cat_performance', 'Performance', 'performance', 'Durable textiles for activewear, workwear, and technical products.', true),
  ('cat_decorative', 'Decorative', 'decorative', 'Border fabrics, trims, and statement textiles for special applications.', false),
  ('cat_tailoring', 'Tailoring', 'tailoring', 'Structured blends for jackets, suiting, and premium apparel.', false)
ON CONFLICT (id) DO NOTHING;

INSERT INTO products (
  id, slug, name, description, category_slug, category_name, material, weave, color, width,
  unit_type, unit_increment, price_cents, compare_at_price_cents, stock_qty, minimum_order_qty,
  badge, shipbob_reference_id, visual_tone, status, featured, specs, deal_note
) VALUES
  (
    'prod_indigo_twill',
    'indigo-loom-cotton-twill',
    'Indigo Loom Cotton Twill',
    'Dense midweight cotton twill for utility shirts, aprons, uniforms, and structured apparel.',
    'cotton',
    'Cotton',
    '100% cotton',
    'Twill',
    'Indigo',
    '54 in',
    'yard',
    1,
    1850,
    2400,
    840,
    2,
    'Best Seller',
    'TL-INDIGO-TWILL',
    'indigo',
    'active',
    true,
    ARRAY['Midweight', 'Reactive dye', 'Cut-to-order', 'Pre-shrunk']::text[],
    'Eligible for the Spring Loom Event discount.'
  ),
  (
    'prod_sandstone_linen',
    'sandstone-linen-canvas',
    'Sandstone Linen Canvas',
    'Airy linen canvas with a crisp finish for home goods, relaxed tailoring, and elevated basics.',
    'linen',
    'Linen',
    '85% linen, 15% cotton',
    'Canvas',
    'Sandstone',
    '58 in',
    'yard',
    1,
    2200,
    2800,
    510,
    2,
    'New Arrival',
    'TL-SANDSTONE-LINEN',
    'sand',
    'active',
    true,
    ARRAY['Stonewashed', 'Breathable', 'Cut-to-order', 'Low-lint']::text[],
    'Pairs well with wholesale starter pricing.'
  ),
  (
    'prod_evergreen_performance',
    'evergreen-recycled-performance-weave',
    'Evergreen Recycled Performance Weave',
    'Moisture-resistant recycled blend for activewear, travel gear, and durable lifestyle products.',
    'performance',
    'Performance',
    'Recycled polyester blend',
    'Performance weave',
    'Evergreen',
    '60 in',
    'yard',
    1,
    1600,
    2000,
    780,
    3,
    'Eco Line',
    'TL-EVERGREEN-PERFORMANCE',
    'sage',
    'active',
    true,
    ARRAY['Moisture resistant', 'Quick dry', 'Low stretch', 'Cut-to-order']::text[],
    NULL
  ),
  (
    'prod_ember_jacquard',
    'ember-jacquard-border',
    'Ember Jacquard Border',
    'Decorative jacquard border textile for premium accents, trims, and special collections.',
    'decorative',
    'Decorative',
    'Poly-cotton blend',
    'Jacquard',
    'Ember',
    '45 in',
    'yard',
    1,
    2700,
    3200,
    210,
    1,
    'Limited',
    'TL-EMBER-JACQUARD',
    'amber',
    'active',
    false,
    ARRAY['Patterned border', 'High detail weave', 'Premium trim', 'Limited run']::text[],
    NULL
  ),
  (
    'prod_midnight_suiting',
    'midnight-wool-suiting',
    'Midnight Wool Suiting',
    'Smooth tailored suiting fabric for jackets, trousers, and polished apparel programs.',
    'tailoring',
    'Tailoring',
    'Wool blend',
    'Plain weave',
    'Midnight',
    '60 in',
    'yard',
    1,
    3400,
    4200,
    120,
    2,
    'Premium',
    'TL-MIDNIGHT-SUITING',
    'ruby',
    'active',
    true,
    ARRAY['Tailoring grade', 'Smooth hand', 'Deep color', 'Low stock']::text[],
    'Priority shipment available through the East Harbor 3PL route.'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO promotions (
  id, name, description, code, type, status, discount_summary, applies_to, valid_through
) VALUES
  (
    'promo_spring_loom',
    'Spring Loom Event',
    '15% off selected cotton and linen fabrics.',
    'LOOM15',
    'percent',
    'active',
    '15% off cotton and linen styles',
    'Cotton + Linen categories',
    '2026-06-30'
  ),
  (
    'promo_wholesale_starter',
    'Wholesale Starter',
    '$50 off orders above $500 for new bulk buyers.',
    'WHOLESALE50',
    'fixed_amount',
    'active',
    '$50 off orders over $500',
    'Wholesale carts',
    '2026-09-15'
  ),
  (
    'promo_freight_free',
    'Freight Free Shipping',
    'Free shipping on qualified domestic orders.',
    'SHIPFREE',
    'free_shipping',
    'scheduled',
    'Free shipping over $150',
    'Domestic retail orders',
    '2026-08-01'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO fulfillment_partners (
  id, name, integration_type, status, region, turnaround, contact
) VALUES
  (
    'partner_east_harbor',
    'East Harbor 3PL',
    'api',
    'active',
    'Northeast',
    'Same-day pick, next-day dock',
    'ops@eastharbor3pl.example'
  ),
  (
    'partner_metro_textile',
    'Metro Textile Fulfillment',
    'csv',
    'active',
    'Mid-Atlantic',
    '24-hour pick',
    'fulfillment@metrotextile.example'
  ),
  (
    'partner_shipbob',
    'ShipBob',
    'api',
    'active',
    'National',
    'Same-day ship on eligible SKUs',
    'integrations@shipbob.example'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_locations (
  id, name, type, region, contact
) VALUES
  (
    'loc_brooklyn_stockroom',
    'Brooklyn Stockroom',
    'warehouse',
    'New York',
    'brooklyn-ops@example.com'
  ),
  (
    'loc_east_harbor',
    'East Harbor 3PL',
    '3pl',
    'New Jersey',
    'ops@eastharbor3pl.example'
  ),
  (
    'loc_jersey_transit',
    'Jersey Transit Hub',
    'in_transit',
    'New Jersey',
    'logistics@example.com'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO inventory_levels (
  id, inventory_location_id, inventory_location_name, product_id, product_name, variant_name,
  on_hand_qty, reserved_qty, available_qty, low_stock_threshold
) VALUES
  (
    'inv_1',
    'loc_brooklyn_stockroom',
    'Brooklyn Stockroom',
    'prod_indigo_twill',
    'Indigo Loom Cotton Twill',
    'Indigo / Yard',
    420,
    60,
    360,
    120
  ),
  (
    'inv_2',
    'loc_brooklyn_stockroom',
    'Brooklyn Stockroom',
    'prod_sandstone_linen',
    'Sandstone Linen Canvas',
    'Sandstone / Yard',
    270,
    35,
    235,
    90
  ),
  (
    'inv_3',
    'loc_east_harbor',
    'East Harbor 3PL',
    'prod_evergreen_performance',
    'Evergreen Recycled Performance Weave',
    'Evergreen / Yard',
    510,
    95,
    415,
    150
  ),
  (
    'inv_4',
    'loc_east_harbor',
    'East Harbor 3PL',
    'prod_midnight_suiting',
    'Midnight Wool Suiting',
    'Midnight / Yard',
    120,
    14,
    106,
    80
  ),
  (
    'inv_5',
    'loc_jersey_transit',
    'Jersey Transit Hub',
    'prod_ember_jacquard',
    'Ember Jacquard Border',
    'Ember / Yard',
    90,
    10,
    80,
    30
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO orders (
  id, order_number, customer_name, status, payment_status, created_at,
  total_cents, shipping_total_cents, item_count, fulfillment_partner_name,
  destination, shipping_address, notes, updated_at
) VALUES
  (
    'order_1048',
    'TX-1048',
    'Maya Patel',
    'shipped',
    'captured',
    '2026-06-08T14:22:00Z',
    29400,
    1800,
    2,
    'East Harbor 3PL',
    'Brooklyn, NY',
    NULL,
    NULL,
    '2026-06-08T14:22:00Z'
  ),
  (
    'order_1049',
    'TX-1049',
    'Jordan Smith',
    'paid',
    'captured',
    '2026-06-11T16:40:00Z',
    21300,
    1500,
    1,
    'Brooklyn Stockroom',
    'Philadelphia, PA',
    NULL,
    NULL,
    '2026-06-11T16:40:00Z'
  ),
  (
    'order_1050',
    'TX-1050',
    'Acme Interiors',
    'allocated',
    'authorized',
    '2026-06-12T12:05:00Z',
    63600,
    4200,
    2,
    'East Harbor 3PL',
    'Jersey City, NJ',
    NULL,
    NULL,
    '2026-06-12T12:05:00Z'
  ),
  (
    'order_1051',
    'TX-1051',
    'Studio North',
    'exception',
    'captured',
    '2026-06-13T09:12:00Z',
    12700,
    1600,
    1,
    'Metro Textile Fulfillment',
    'Newark, NJ',
    NULL,
    'Address verification needed before release.',
    '2026-06-13T09:12:00Z'
  ),
  (
    'order_1052',
    'TX-1052',
    'North Shore Atelier',
    'paid',
    'captured',
    '2026-06-15T10:18:00Z',
    19000,
    1400,
    1,
    'ShipBob',
    'Boston, MA',
    '{"address1":"88 Seaport Blvd","address2":"Suite 102","companyName":"North Shore Atelier","city":"Boston","state":"MA","country":"US","zipCode":"02110","email":"ops@northshoreatelier.example","phoneNumber":"617-555-0148"}'::jsonb,
    'Ready for automated fulfillment dispatch.',
    '2026-06-15T10:18:00Z'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO order_items (
  id, order_id, position, product_name, variant_name, quantity,
  unit_price_cents, line_total_cents, shipbob_reference_id, fulfillment_status
) VALUES
  ('item_1048_1', 'order_1048', 1, 'Indigo Loom Cotton Twill', 'Indigo / Yard', 12, 1850, 22200, 'TL-INDIGO-TWILL', 'fulfilled'),
  ('item_1048_2', 'order_1048', 2, 'Ember Jacquard Border', 'Ember / Yard', 2, 2700, 5400, 'TL-EMBER-JACQUARD', 'fulfilled'),
  ('item_1049_1', 'order_1049', 1, 'Sandstone Linen Canvas', 'Sandstone / Yard', 9, 2200, 19800, 'TL-SANDSTONE-LINEN', 'allocated'),
  ('item_1050_1', 'order_1050', 1, 'Evergreen Recycled Performance Weave', 'Evergreen / Yard', 18, 1600, 28800, 'TL-EVERGREEN-PERFORMANCE', 'allocated'),
  ('item_1050_2', 'order_1050', 2, 'Midnight Wool Suiting', 'Midnight / Yard', 9, 3400, 30600, 'TL-MIDNIGHT-SUITING', 'allocated'),
  ('item_1051_1', 'order_1051', 1, 'Indigo Loom Cotton Twill', 'Indigo / Yard', 6, 1850, 11100, 'TL-INDIGO-TWILL', 'backordered'),
  ('item_1052_1', 'order_1052', 1, 'Sandstone Linen Canvas', 'Sandstone / Yard', 8, 2200, 17600, 'TL-SANDSTONE-LINEN', 'pending')
ON CONFLICT (id) DO NOTHING;

INSERT INTO fulfillment_requests (
  id, order_id, order_number, fulfillment_partner_id, fulfillment_partner_name,
  inventory_location_id, inventory_location_name, status, partner_reference,
  request_payload, response_payload, created_at, updated_at
) VALUES
  (
    'request_1048',
    'order_1048',
    'TX-1048',
    'partner_east_harbor',
    'East Harbor 3PL',
    'loc_east_harbor',
    'East Harbor 3PL',
    'fulfilled',
    'EHB-1048',
    '{"orderNumber":"TX-1048","customerName":"Maya Patel","destination":"Brooklyn, NY","itemCount":2}'::jsonb,
    '{"trackingNumber":"TXT-1048","carrier":"UPS","serviceLevel":"Ground","accepted":true}'::jsonb,
    '2026-06-09T15:58:00Z',
    '2026-06-09T16:30:00Z'
  ),
  (
    'request_1049',
    'order_1049',
    'TX-1049',
    'partner_shipbob',
    'ShipBob',
    'loc_brooklyn_stockroom',
    'Brooklyn Stockroom',
    'fulfilled',
    'SB-1049',
    '{"orderNumber":"TX-1049","customerName":"Jordan Smith","destination":"Philadelphia, PA","itemCount":1}'::jsonb,
    '{"trackingNumber":"TXT-1049","carrier":"FedEx","serviceLevel":"Home Delivery","accepted":true}'::jsonb,
    '2026-06-12T12:20:00Z',
    '2026-06-12T13:05:00Z'
  ),
  (
    'request_1050',
    'order_1050',
    'TX-1050',
    'partner_east_harbor',
    'East Harbor 3PL',
    'loc_east_harbor',
    'East Harbor 3PL',
    'accepted',
    'EHB-1050',
    '{"orderNumber":"TX-1050","customerName":"Acme Interiors","destination":"Jersey City, NJ","itemCount":2}'::jsonb,
    '{"message":"Label created and tracking assigned.","trackingNumber":"TXT-1050","carrier":"DHL","serviceLevel":"Priority"}'::jsonb,
    '2026-06-13T13:42:00Z',
    '2026-06-13T14:10:00Z'
  ),
  (
    'request_1051',
    'order_1051',
    'TX-1051',
    'partner_metro_textile',
    'Metro Textile Fulfillment',
    NULL,
    NULL,
    'failed',
    NULL,
    '{"orderNumber":"TX-1051","customerName":"Studio North","destination":"Newark, NJ","itemCount":1}'::jsonb,
    '{"error":"Address verification failed"}'::jsonb,
    '2026-06-13T11:05:00Z',
    '2026-06-13T13:45:00Z'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO shipments (
  id, order_id, fulfillment_request_id, order_number, tracking_number, carrier, service_level, status,
  partner_name, destination, created_at, shipped_at, delivered_at, estimated_delivery_at,
  last_event_at, updated_at
) VALUES
  (
    'ship_1048',
    'order_1048',
    'request_1048',
    'TX-1048',
    'TXT-1048',
    'UPS',
    'Ground',
    'in_transit',
    'East Harbor 3PL',
    'Brooklyn, NY',
    '2026-06-09T15:58:00Z',
    '2026-06-09T16:30:00Z',
    NULL,
    '2026-06-13T18:00:00Z',
    '2026-06-10T08:41:00Z',
    '2026-06-10T08:41:00Z'
  ),
  (
    'ship_1049',
    'order_1049',
    'request_1049',
    'TX-1049',
    'TXT-1049',
    'FedEx',
    'Home Delivery',
    'delivered',
    'Brooklyn Stockroom',
    'Philadelphia, PA',
    '2026-06-12T12:20:00Z',
    '2026-06-12T13:05:00Z',
    '2026-06-14T10:22:00Z',
    '2026-06-14T18:00:00Z',
    '2026-06-14T10:22:00Z',
    '2026-06-14T10:22:00Z'
  ),
  (
    'ship_1050',
    'order_1050',
    'request_1050',
    'TX-1050',
    'TXT-1050',
    'DHL',
    'Priority',
    'label_created',
    'East Harbor 3PL',
    'Jersey City, NJ',
    '2026-06-13T13:42:00Z',
    '2026-06-13T14:10:00Z',
    NULL,
    '2026-06-16T18:00:00Z',
    '2026-06-13T15:02:00Z',
    '2026-06-13T15:02:00Z'
  ),
  (
    'ship_1051',
    'order_1051',
    NULL,
    'TX-1051',
    'TXT-1051',
    'UPS',
    'Ground',
    'exception',
    'Metro Textile Fulfillment',
    'Newark, NJ',
    '2026-06-13T11:05:00Z',
    '2026-06-13T11:20:00Z',
    NULL,
    '2026-06-17T18:00:00Z',
    '2026-06-13T13:45:00Z',
    '2026-06-13T13:45:00Z'
  )
ON CONFLICT (id) DO NOTHING;

INSERT INTO shipment_events (
  id, shipment_id, event_status, message, event_at, source
) VALUES
  (
    'event_1048_1',
    'ship_1048',
    'label_created',
    'Shipping label created and transmitted to UPS.',
    '2026-06-09T15:58:00Z',
    '3pl'
  ),
  (
    'event_1048_2',
    'ship_1048',
    'packed',
    'Order packed at East Harbor 3PL.',
    '2026-06-09T16:14:00Z',
    '3pl'
  ),
  (
    'event_1048_3',
    'ship_1048',
    'in_transit',
    'Shipment departed the local hub.',
    '2026-06-10T08:41:00Z',
    'carrier'
  ),
  (
    'event_1049_1',
    'ship_1049',
    'label_created',
    'FedEx label created.',
    '2026-06-12T12:30:00Z',
    '3pl'
  ),
  (
    'event_1049_2',
    'ship_1049',
    'shipped',
    'Shipment left the Brooklyn Stockroom.',
    '2026-06-12T13:05:00Z',
    'carrier'
  ),
  (
    'event_1049_3',
    'ship_1049',
    'delivered',
    'Delivered to receiving desk.',
    '2026-06-14T10:22:00Z',
    'carrier'
  ),
  (
    'event_1050_1',
    'ship_1050',
    'label_created',
    'Priority label generated for large wholesale order.',
    '2026-06-13T14:10:00Z',
    '3pl'
  ),
  (
    'event_1050_2',
    'ship_1050',
    'packed',
    'Packed and staged for carrier pickup.',
    '2026-06-13T15:02:00Z',
    '3pl'
  ),
  (
    'event_1051_1',
    'ship_1051',
    'label_created',
    'Label created after allocation.',
    '2026-06-13T11:20:00Z',
    '3pl'
  ),
  (
    'event_1051_2',
    'ship_1051',
    'exception',
    'Address validation failed and shipment is on hold.',
    '2026-06-13T13:45:00Z',
    'customer_service'
  )
ON CONFLICT (id) DO NOTHING;
