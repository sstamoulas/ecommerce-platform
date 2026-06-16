import { NextResponse } from "next/server";

import { getFormOptionalValue, getFormValue } from "@/lib/admin-form";
import { getAdminSessionFromRequest } from "@/lib/admin-auth";
import { getRepository } from "@/lib/data";

export async function POST(request: Request) {
  if (!getAdminSessionFromRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const repo = getRepository();
  const formData = await request.formData();

  await repo.createPromotion({
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
