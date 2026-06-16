import { NextResponse } from "next/server";

import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  if (!getAdminSessionFromRequest(_request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = getRepository();
  const { orderId } = await params;
  const order = await repo.getOrderById(orderId);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  return NextResponse.json({ data: order });
}

export async function PATCH(request: Request, { params }: RouteContext) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = getRepository();
  const payload = await request.json().catch(() => ({}));
  const { orderId } = await params;
  const order = await repo.getOrderById(orderId);

  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const updated = await repo.updateOrder(orderId, payload);

  return NextResponse.json({ data: updated ?? order });
}
