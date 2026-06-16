import { NextResponse } from "next/server";

import { getFormNumber, getFormOptionalValue, getFormValue } from "@/lib/admin-form";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";

type RouteContext = {
  params: Promise<{
    orderId: string;
  }>;
};

function redirectBack(request: Request, orderId: string) {
  return NextResponse.redirect(new URL(`/admin/orders/${orderId}`, request.url), { status: 303 });
}

export async function POST(request: Request, { params }: RouteContext) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { orderId } = await params;
  const repo = getRepository();
  const order = await repo.getOrderById(orderId);
  if (!order) {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  const formData = await request.formData();
  const action = getFormValue(formData, "action", "update");

  if (action === "cancel") {
    await repo.updateOrder(orderId, { status: "canceled" });
    return redirectBack(request, orderId);
  }

  if (action === "refund") {
    await repo.updateOrder(orderId, { status: "refunded", paymentStatus: "refunded" });
    return redirectBack(request, orderId);
  }

  if (action === "mark_paid") {
    await repo.updateOrder(orderId, { status: "paid", paymentStatus: "captured" });
    return redirectBack(request, orderId);
  }

  if (action === "allocate") {
    await repo.updateOrder(orderId, { status: "allocated" });
    return redirectBack(request, orderId);
  }

  if (action === "mark_shipped") {
    await repo.updateOrder(orderId, { status: "shipped" });
    return redirectBack(request, orderId);
  }

  if (action === "mark_exception") {
    await repo.updateOrder(orderId, { status: "exception" });
    return redirectBack(request, orderId);
  }

  await repo.updateOrder(orderId, {
    customerName: getFormValue(formData, "customerName").trim(),
    fulfillmentPartnerName: getFormValue(formData, "fulfillmentPartnerName").trim(),
    destination: getFormValue(formData, "destination").trim(),
    status: getFormValue(formData, "status").trim() as
      | "draft"
      | "pending_payment"
      | "paid"
      | "allocated"
      | "partially_fulfilled"
      | "fulfilled"
      | "shipped"
      | "delivered"
      | "canceled"
      | "refunded"
      | "exception",
    paymentStatus: getFormValue(formData, "paymentStatus").trim() as
      | "pending"
      | "authorized"
      | "captured"
      | "failed"
      | "refunded",
    total: getFormNumber(formData, "total", order.total),
    shippingTotal: getFormNumber(formData, "shippingTotal", order.shippingTotal),
    notes: getFormOptionalValue(formData, "notes"),
  });

  return redirectBack(request, orderId);
}
