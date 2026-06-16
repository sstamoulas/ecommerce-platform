import { NextResponse } from "next/server";

import { getFormOptionalValue, getFormValue } from "@/lib/admin-form";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";

type RouteContext = {
  params: Promise<{
    promotionId: string;
  }>;
};

export async function POST(request: Request, { params }: RouteContext) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { promotionId } = await params;
  const repo = getRepository();
  const formData = await request.formData();
  const action = getFormValue(formData, "action", "update");

  if (action === "delete") {
    await repo.deletePromotion(promotionId);
    return NextResponse.redirect(new URL("/admin/promotions", request.url), { status: 303 });
  }

  await repo.updatePromotion(promotionId, {
    name: getFormValue(formData, "name").trim(),
    description: getFormValue(formData, "description").trim(),
    code: getFormOptionalValue(formData, "code"),
    type: getFormValue(formData, "type").trim() as "percent" | "fixed_amount" | "bundle" | "bogo" | "free_shipping",
    status: getFormValue(formData, "status").trim() as "draft" | "active" | "scheduled" | "ended",
    discountSummary: getFormValue(formData, "discountSummary").trim(),
    appliesTo: getFormValue(formData, "appliesTo").trim(),
    validThrough: getFormValue(formData, "validThrough").trim(),
  });

  return NextResponse.redirect(new URL("/admin/promotions", request.url), { status: 303 });
}
