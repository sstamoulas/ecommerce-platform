import { NextResponse } from "next/server";

import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";

export async function GET(request: Request) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = getRepository();
  const orders = await repo.listOrders();

  return NextResponse.json({
    data: orders,
    meta: {
      count: orders.length,
    },
  });
}

export async function POST(request: Request) {
  const repo = getRepository();
  const payload = await request.json().catch(() => ({}));
  const items = Array.isArray(payload.items) ? payload.items : [];

  const order = await repo.createOrder({
    customerName: payload.customerName ?? "New customer",
    total: Number(payload.total ?? 0),
    shippingTotal: Number(payload.shippingTotal ?? 0),
    fulfillmentPartnerName: payload.fulfillmentPartnerName ?? "Unassigned",
    destination: payload.destination ?? "Unassigned",
    shippingAddress: payload.shippingAddress ?? undefined,
    items,
    status: "pending_payment",
    paymentStatus: "pending",
  });

  return NextResponse.json({ data: order }, { status: 201 });
}
